import { describe, expect, it, vi } from 'vitest'
import type { PluginContext } from 'fh2-plugin-sdk'
import type { StatusState } from '../src/views/status-panel/contract'
import plugin from '../src/plugin'

interface Session {
  state: { get: () => StatusState };
  methods: { refresh: () => Promise<void> };
}
const view = vi.hoisted(() => ({ handle: vi.fn(), get: vi.fn() }))
vi.mock('../src/views/status-panel/contract', async importOriginal => ({
  ...await importOriginal<typeof import('../src/views/status-panel/contract')>(), statusPanel: view,
}))

async function activate (apiCall: ReturnType<typeof vi.fn>, host = 'cockpit', lifecycle = { disposed: false }) {
  const contribute = vi.fn()
  await plugin.activate({ host: { id: host }, lifecycle, apiCall, extensions: { contribute } } as unknown as PluginContext)
  return contribute
}

describe('Flugdeck-Panel', () => {
  it('registriert das Panel ausschließlich im Cockpit', async () => {
    expect(await activate(vi.fn(), 'project')).not.toHaveBeenCalled()
    expect(await activate(vi.fn())).toHaveBeenCalledWith('status-panel', expect.objectContaining({ visible: true }))
  })

  it('bündelt Doppelklicks und zeigt die vom Backend gelieferte Version', async () => {
    let finish!: (value: unknown) => void
    const apiCall = vi.fn(() => new Promise(resolve => { finish = resolve }))
    await activate(apiCall)
    const session = view.handle.mock.lastCall![1] as Session
    const request = session.methods.refresh()
    expect(session.state.get().phase).toBe('loading')
    await session.methods.refresh()
    expect(apiCall).toHaveBeenCalledTimes(1)
    expect(apiCall).toHaveBeenCalledWith('/plugin/invoke', { method: 'POST', timeoutMs: 8000, body: { pluginId: 'exp_flugdeck_backend', handler: 'flugdeck.status', input: {} } })
    finish({ code: 0, data: { service: 'flugdeck', version: '0.2.0' } })
    await request
    expect(session.state.get()).toEqual({ phase: 'ready', detail: '0.2.0', checkedAt: expect.any(Number), durationMs: expect.any(Number) })
  })

  it('behandelt Gatewayfehler und fehlerhafte Antworten und erlaubt erneute Prüfung', async () => {
    const apiCall = vi.fn().mockRejectedValueOnce(new Error('Verbindung unterbrochen'))
      .mockResolvedValueOnce({ code: 0, data: {} })
      .mockResolvedValueOnce({ code: 0, data: { service: 'flugdeck', version: '0.2.0' } })
    await activate(apiCall)
    const session = view.handle.mock.lastCall![1] as Session
    await session.methods.refresh()
    expect(session.state.get()).toMatchObject({ phase: 'error', detail: 'Verbindung unterbrochen' })
    await session.methods.refresh()
    expect(session.state.get().phase).toBe('error')
    await session.methods.refresh()
    expect(session.state.get().phase).toBe('ready')
  })

  it('zeigt strukturierte DJI-Fehler aus dem Host und erlaubt einen neuen Versuch', async () => {
    const apiCall = vi.fn().mockRejectedValueOnce({ code: 'TIMEOUT', message: 'timeout' })
      .mockRejectedValueOnce({ code: 'PLUGIN_GATEWAY_ERROR', message: 'Zugriff abgelehnt', detail: { gatewayCode: 403 } })
    await activate(apiCall)
    const session = view.handle.mock.lastCall![1] as Session
    await session.methods.refresh()
    expect(session.state.get().detail).toContain('8 Sekunden')
    await session.methods.refresh()
    expect(session.state.get().detail).toBe('Zugriff abgelehnt (Gateway 403)')
  })

  it('verwirft die Antwort eines bereits entladenen Hosts', async () => {
    const lifecycle = { disposed: false }
    let finish!: (value: unknown) => void
    const apiCall = vi.fn(() => new Promise(resolve => { finish = resolve }))
    await activate(apiCall, 'cockpit', lifecycle)
    const session = view.handle.mock.lastCall![1] as Session
    const request = session.methods.refresh()
    lifecycle.disposed = true
    finish({ code: 0, data: { service: 'flugdeck', version: '0.2.0' } })
    await request
    await session.methods.refresh()
    expect(session.state.get().checkedAt).toBeNull()
    expect(apiCall).toHaveBeenCalledTimes(1)
  })
})
