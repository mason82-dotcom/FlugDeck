// @vitest-environment happy-dom
import { createApp, nextTick } from 'vue'
import { expect, it, vi } from 'vitest'
import Panel from '../src/views/status-panel/Panel.vue'
import { initialStatus } from '../src/views/status-panel/contract'
import type { StatusClient, StatusState } from '../src/views/status-panel/contract'

it('zeigt Ergebnis und Fehler im gemounteten Panel und räumt das Abonnement auf', async () => {
  let update!: (state: StatusState) => void
  const dispose = vi.fn()
  const client = {
    state: { subscribe (listener: typeof update) { update = listener; return { dispose } } },
    refresh: vi.fn().mockRejectedValueOnce(new Error('View-Kanal unterbrochen')).mockResolvedValue(undefined),
  }
  const target = document.createElement('div')
  const app = createApp(Panel, { client: client as unknown as StatusClient })
  app.mount(target)
  await Promise.resolve()
  await nextTick()
  expect(target.textContent).toContain('Panelverbindung gestört')
  const button = target.querySelector('.readout + .error + dl + button, dl + button') as HTMLButtonElement
  button.click()
  await Promise.resolve()
  update({ ...initialStatus, phase: 'loading' })
  await nextTick()
  expect(button.disabled).toBe(true)
  update({ phase: 'ready', detail: '0.2.0', checkedAt: 1700000000000, durationMs: 12 })
  await nextTick()
  expect(target.textContent).toContain('Erreichbar')
  expect(target.textContent).toContain('12 ms')
  expect(target.textContent).toContain('0.2.0')
  update({ phase: 'error', detail: 'Gateway unterbrochen', checkedAt: 1700000000012, durationMs: 8 })
  await nextTick()
  expect(target.textContent).toContain('Gateway unterbrochen')
  expect(target.textContent).not.toContain('0.2.0')
  app.unmount()
  expect(dispose).toHaveBeenCalledOnce()
})

it('zeigt beim erneuten Prüfen sofort den Ladezustand und blendet alte Werte aus', async () => {
  let finish!: () => void
  const client = {
    state: { subscribe (listener: (value: StatusState) => void) {
      listener({ phase: 'ready', detail: 'alte-version', checkedAt: 1, durationMs: 12 })
      return { dispose () {} }
    } },
    refresh: vi.fn().mockResolvedValueOnce(undefined).mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve })),
  }
  const target = document.createElement('div')
  const app = createApp(Panel, { client: client as unknown as StatusClient })
  app.mount(target)
  try {
    await Promise.resolve()
    await nextTick()
    ;(target.querySelector('dl + button') as HTMLButtonElement).click()
    await nextTick()
    expect(target.querySelector('[role=status]')?.textContent).toContain('Prüfung läuft')
    expect(target.textContent).not.toContain('alte-version')
    expect(target.textContent).not.toContain('12 ms')
  } finally {
    finish()
    app.unmount()
  }
})

it('prüft eingegebene Dock-4-Topologie ohne einen Geräteaufruf', async () => {
  const client = {
    state: { subscribe () { return { dispose () {} } } },
    refresh: vi.fn().mockResolvedValue(undefined),
  }
  const target = document.createElement('div')
  const app = createApp(Panel, { client: client as unknown as StatusClient })
  app.mount(target)
  await Promise.resolve()
  target.querySelectorAll('.tabs button')[1]!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await nextTick()
  target.querySelectorAll('.subtabs button')[2]!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await nextTick()
  expect(target.textContent).toContain('Angaben fehlen')
  const mode = target.querySelector('select')!
  mode.value = 'external'
  mode.dispatchEvent(new Event('change', { bubbles: true }))
  const inputs = target.querySelectorAll<HTMLInputElement>('input')
  for (const [index, value] of ['19.01.00.58', '19.01.00.07', '19.01.00.07'].entries()) {
    inputs[index]!.value = value
    inputs[index]!.dispatchEvent(new Event('input', { bubbles: true }))
  }
  await nextTick()
  expect(target.querySelector('.assessment')?.textContent).toContain('Versionsprüfung bestanden')
  inputs[0]!.value = '19.01.00.57'
  inputs[0]!.dispatchEvent(new Event('input', { bubbles: true }))
  await nextTick()
  expect(target.querySelector('.assessment')?.textContent).toContain('Voraussetzung nicht erfüllt')
  expect(client.refresh).toHaveBeenCalledTimes(1)
  app.unmount()
})

it('trennt die Offline-Simulation sichtbar vom Backend und markiert Linkverlust als unbekannt', async () => {
  const client = { state: { subscribe () { return { dispose () {} } } }, refresh: vi.fn().mockResolvedValue(undefined) }
  const target = document.createElement('div')
  const app = createApp(Panel, { client: client as unknown as StatusClient })
  app.mount(target)
  await Promise.resolve()
  ;(target.querySelectorAll('.tabs button')[1] as HTMLButtonElement).click()
  await nextTick()
  ;(target.querySelectorAll('.subtabs button')[3] as HTMLButtonElement).click()
  await nextTick()
  expect(target.textContent).toContain('SIMULATION · OFFLINE')
  ;(target.querySelector('.sim-actions button') as HTMLButtonElement).click()
  await nextTick()
  expect(target.textContent).toContain('Online (simuliert)')
  ;(target.querySelector('.sim-actions .secondary') as HTMLButtonElement).click()
  await nextTick()
  expect(target.textContent).toContain('Verbindung verloren')
  expect(target.textContent).toContain('Unbekannt')
  expect(client.refresh).toHaveBeenCalledTimes(1)
  app.unmount()
})

it('kennzeichnet Beispielbeobachtungen und verwirft sie nach fehlerhaftem Import', async () => {
  const client = { state: { subscribe () { return { dispose () {} } } }, refresh: vi.fn().mockResolvedValue(undefined) }
  const target = document.createElement('div')
  const app = createApp(Panel, { client: client as unknown as StatusClient })
  app.mount(target)
  await Promise.resolve()
  ;(target.querySelectorAll('.tabs button')[1] as HTMLButtonElement).click()
  await nextTick()
  ;(target.querySelectorAll('.subtabs button')[1] as HTMLButtonElement).click()
  await nextTick()
  ;(target.querySelectorAll('.observations > button')[1] as HTMLButtonElement).click()
  await nextTick()
  expect(target.textContent).toContain('anonymisierte Beispieldaten')
  expect(target.textContent).toContain('DJI Mavic 3E')
  expect(target.textContent).not.toContain('DJI Mavic 3M')
  ;(target.querySelector('.observations .secondary') as HTMLButtonElement).click()
  await nextTick()
  expect(target.querySelector('[role=alert]')?.textContent).toContain('Bisherige Daten wurden verworfen')
  expect(target.querySelectorAll('.observed-list li')).toHaveLength(0)
  app.unmount()
})

it('zeigt echte Backend-Projektion nur als Live-Quelle und löscht sie bei stale', async () => {
  const now = Date.now()
  const live = { schemaVersion: 1, source: 'live', fetchedAt: now, devices: [
    { key: 'live-device-1', model: 'rc-pro', gatewayKey: null, online: true, topologyAt: now, osdAt: null },
  ] }
  const client = { state: { subscribe () { return { dispose () {} } } }, refresh: vi.fn().mockResolvedValue(undefined),
    refreshLive: vi.fn().mockResolvedValueOnce(JSON.stringify(live)).mockResolvedValueOnce(JSON.stringify({ source: 'stale', fetchedAt: now - 120_000, devices: [] })) }
  const target = document.createElement('div')
  const app = createApp(Panel, { client: client as unknown as StatusClient })
  app.mount(target)
  await Promise.resolve()
  ;(target.querySelectorAll('.tabs button')[1] as HTMLButtonElement).click()
  await nextTick()
  ;(target.querySelectorAll('.subtabs button')[1] as HTMLButtonElement).click()
  await nextTick()
  const button = target.querySelector('.observations > button') as HTMLButtonElement
  button.click()
  await Promise.resolve()
  await nextTick()
  expect(target.textContent).toContain('FlightHub On-Premises OpenAPI · letzter Abruf')
  expect(target.textContent).toContain('OSDUNBEKANNT')
  button.click()
  await Promise.resolve()
  await nextTick()
  expect(target.textContent).toContain('Live-Snapshot ist veraltet')
  expect(target.querySelectorAll('.observed-list li')).toHaveLength(0)
  app.unmount()
})
