import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PluginContext } from 'fh2-plugin-sdk'
import plugin from '../src/plugin'

const views = vi.hoisted(() => ({
  flightlog: { handle: vi.fn(), get: vi.fn() },
  plan: { handle: vi.fn(), get: vi.fn() },
  popup: { handle: vi.fn(), get: vi.fn() },
}))
vi.mock('../src/views/flightlog-page/contract', async importOriginal => ({
  ...await importOriginal<typeof import('../src/views/flightlog-page/contract')>(), flightlogPage: views.flightlog,
}))
vi.mock('../src/views/plan-note/contract', async importOriginal => ({
  ...await importOriginal<typeof import('../src/views/plan-note/contract')>(), planNote: views.plan,
}))
vi.mock('../src/views/alert-popup/contract', async importOriginal => ({
  ...await importOriginal<typeof import('../src/views/alert-popup/contract')>(), alertPopup: views.popup,
}))

function capability<S> (initial: S) {
  let listener: ((value: S) => void) | undefined
  return {
    getState: vi.fn(async () => initial),
    onStateChanged: vi.fn(async (handler: (value: S) => void) => { listener = handler; return { dispose: vi.fn() } }),
    emit: (value: S) => listener?.(value),
  }
}

async function activate (host: string, apiCall = vi.fn(), capabilities: Record<string, unknown> = {}) {
  const contribution = { update: vi.fn() }
  const contribute = vi.fn(async () => contribution)
  await plugin.activate({
    host: { id: host }, lifecycle: { disposed: false }, apiCall,
    extensions: { contribute },
    capabilities: { get: vi.fn(async (id: string) => capabilities[id]) },
    logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
  } as unknown as PluginContext)
  return { contribute, contribution }
}

beforeEach(() => { for (const view of Object.values(views)) view.handle.mockClear() })

describe('Project: Flugbuch', () => {
  it('lädt die Flüge des aktuellen Projekts und lädt bei Projektwechsel neu', async () => {
    const project = capability({ projectId: 'p-1', organizationId: null, userInfo: {} })
    const apiCall = vi.fn(async () => ({ code: 0, data: { items: [{ flightKey: 'f-1' }], total: 1 } }))
    const { contribute } = await activate('project', apiCall, { 'project:context': project })
    expect(contribute).toHaveBeenCalledWith('flightlog-sidebar', expect.objectContaining({ label: 'Flugbuch' }))
    const session = views.flightlog.handle.mock.lastCall![1]
    await vi.waitFor(() => expect(session.state.get().phase).toBe('ready'))
    expect(session.state.get()).toMatchObject({ projectId: 'p-1', total: 1 })
    expect(apiCall).toHaveBeenCalledWith('/plugin/invoke', expect.objectContaining({ body: { pluginId: 'exp_flugdeck_backend', handler: 'flightlog.list', input: { projectId: 'p-1', limit: 50 } } }))
    project.emit({ projectId: 'p-2', organizationId: null, userInfo: {} })
    await vi.waitFor(() => expect(session.state.get().projectId).toBe('p-2'))
    expect(apiCall).toHaveBeenCalledTimes(2)
  })

  it('verwirft eine verspätete Liste, wenn das Projekt inzwischen gewechselt hat', async () => {
    const project = capability<{ projectId: string | null; organizationId: null; userInfo: object }>({ projectId: 'p-1', organizationId: null, userInfo: {} })
    let finish!: (value: unknown) => void
    const apiCall = vi.fn(() => new Promise(resolve => { finish = resolve }))
    await activate('project', apiCall, { 'project:context': project })
    const session = views.flightlog.handle.mock.lastCall![1]
    await vi.waitFor(() => expect(apiCall).toHaveBeenCalled())
    project.emit({ projectId: null, organizationId: null, userInfo: {} })
    finish({ code: 0, data: { items: [{ flightKey: 'f-1' }], total: 1 } })
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(session.state.get()).toMatchObject({ projectId: null, items: [], phase: 'error' })
  })

  it('meldet fehlendes Projekt und Backendfehler verständlich', async () => {
    const apiCall = vi.fn().mockRejectedValue(new Error('Gateway unterbrochen'))
    await activate('project', apiCall, { 'project:context': capability({ projectId: null, organizationId: null, userInfo: {} }) })
    const session = views.flightlog.handle.mock.lastCall![1]
    await session.methods.reload()
    expect(session.state.get()).toMatchObject({ phase: 'error', message: 'Kein Projekt ausgewählt.' })
    expect(apiCall).not.toHaveBeenCalled()
  })
})

describe('Plan: Flugbuch-Notiz', () => {
  it('liefert biz_ext nur mit Notiz und übernimmt die Notiz einer kopierten Aufgabe', async () => {
    const form = capability<Record<string, unknown>>({ available: true, revision: 1, formInstanceId: 'form-1', sourceBizExt: { flugdeck: { note: 'Kopie' } } })
    const { contribute } = await activate('plan', vi.fn(), { 'plan:form-context': form })
    const session = views.plan.handle.mock.lastCall![1]
    const contribution = (contribute.mock.calls as unknown as [string, { validate: () => Promise<unknown>; onSubmit: () => Promise<unknown> }][])[0]![1]
    expect(session.state.get()).toEqual({ available: true, note: 'Kopie' })
    session.methods.setNote({ note: '  Inspektion Brücke  ' })
    await expect(contribution.validate()).resolves.toEqual({ valid: true })
    session.methods.setNote({ note: 'x'.repeat(201) })
    await expect(contribution.validate()).resolves.toMatchObject({ valid: false })
    session.methods.setNote({ note: '  Inspektion Brücke  ' })
    await expect(contribution.onSubmit()).resolves.toEqual({ biz_ext: { flugdeck: { note: 'Inspektion Brücke' } } })
    form.emit({ available: true, revision: 2, formInstanceId: 'form-2' })
    expect(session.state.get().note).toBe('')
    await expect(contribution.onSubmit()).resolves.toEqual({})
  })
})

describe('Message: Popup-Platzhalter', () => {
  it('registriert ein unsichtbares Popup, das sich schließen lässt', async () => {
    const { contribute, contribution } = await activate('message')
    expect(contribute).toHaveBeenCalledWith('alert-popup', expect.objectContaining({ visible: false }))
    await views.popup.handle.mock.lastCall![1].methods.close()
    expect(contribution.update).toHaveBeenCalledWith({ visible: false })
  })
})
