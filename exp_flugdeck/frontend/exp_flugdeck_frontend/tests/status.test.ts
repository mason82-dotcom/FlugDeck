import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PluginContext } from 'fh2-plugin-sdk'
import type { CockpitPanelState } from '../src/views/status-panel/contract'
import plugin from '../src/plugin'

interface Session {
  state: { get: () => CockpitPanelState };
  methods: { refresh: () => Promise<void> };
}
const view = vi.hoisted(() => ({ handle: vi.fn(), get: vi.fn() }))
vi.mock('../src/views/status-panel/contract', async importOriginal => ({
  ...await importOriginal<typeof import('../src/views/status-panel/contract')>(), statusPanel: view,
}))

const statusCall = { method: 'POST', timeoutMs: 8000, body: { pluginId: 'exp_flugdeck_backend', handler: 'flugdeck.status', input: {} } }

function fakeCapability<S> (initial: S) {
  let listener: ((value: unknown) => void) | undefined
  return {
    getState: vi.fn(() => initial),
    onStateChanged: vi.fn((handler: (value: unknown) => void) => { listener = handler; return { dispose: vi.fn() } }),
    emit: (value: unknown) => listener?.(value),
  }
}

async function activate (apiCall: ReturnType<typeof vi.fn>, options: { host?: string; lifecycle?: { disposed: boolean }; capabilities?: Record<string, unknown> } = {}) {
  const contribute = vi.fn()
  const capabilities = options.capabilities ?? {}
  const teardown = await plugin.activate({
    host: { id: options.host ?? 'cockpit' },
    lifecycle: options.lifecycle ?? { disposed: false },
    apiCall,
    extensions: { contribute },
    capabilities: { get: vi.fn(async (id: string) => capabilities[id]) },
    logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
  } as unknown as PluginContext)
  return { contribute, teardown, session: view.handle.mock.lastCall?.[1] as Session }
}

describe('Cockpit: Backend-Prüfung', () => {
  beforeEach(() => view.handle.mockClear())

  it('registriert das Linkspanel', async () => {
    const { contribute } = await activate(vi.fn())
    expect(contribute).toHaveBeenCalledWith('status-panel', expect.objectContaining({ visible: true, label: 'Flugdeck' }))
  })

  it('bündelt Doppelklicks und zeigt die vom Backend gelieferte Version', async () => {
    let finish!: (value: unknown) => void
    const apiCall = vi.fn(() => new Promise(resolve => { finish = resolve }))
    const { session } = await activate(apiCall)
    const request = session.methods.refresh()
    expect(session.state.get().backend.phase).toBe('loading')
    await session.methods.refresh()
    expect(apiCall).toHaveBeenCalledTimes(1)
    expect(apiCall).toHaveBeenCalledWith('/plugin/invoke', statusCall)
    finish({ code: 0, data: { service: 'flugdeck', version: '0.3.0' } })
    await request
    expect(session.state.get().backend).toEqual({ phase: 'ready', detail: '0.3.0', checkedAt: expect.any(Number), durationMs: expect.any(Number) })
  })

  it('behandelt Gatewayfehler, fehlerhafte Antworten und Fehlercodes und erlaubt erneute Prüfung', async () => {
    const apiCall = vi.fn().mockRejectedValueOnce(new Error('Verbindung unterbrochen'))
      .mockResolvedValueOnce({ code: 0, data: {} })
      .mockResolvedValueOnce({ code: 500, message: 'Speicher nicht erreichbar', data: null })
      .mockResolvedValueOnce({ code: 0, data: { service: 'flugdeck', version: '0.3.0' } })
    const { session } = await activate(apiCall)
    await session.methods.refresh()
    expect(session.state.get().backend).toMatchObject({ phase: 'error', detail: 'Verbindung unterbrochen' })
    await session.methods.refresh()
    expect(session.state.get().backend.detail).toBe('Unerwartete Antwort vom Flugdeck-Backend.')
    await session.methods.refresh()
    expect(session.state.get().backend.detail).toBe('Speicher nicht erreichbar')
    await session.methods.refresh()
    expect(session.state.get().backend.phase).toBe('ready')
  })

  it('zeigt strukturierte DJI-Fehler aus dem Host', async () => {
    const apiCall = vi.fn().mockRejectedValueOnce({ code: 'TIMEOUT', message: 'timeout' })
      .mockRejectedValueOnce({ code: 'PLUGIN_GATEWAY_ERROR', message: 'Zugriff abgelehnt', detail: { gatewayCode: 403 } })
    const { session } = await activate(apiCall)
    await session.methods.refresh()
    expect(session.state.get().backend.detail).toContain('8 Sekunden')
    await session.methods.refresh()
    expect(session.state.get().backend.detail).toBe('Zugriff abgelehnt (Gateway 403)')
  })

  it('verwirft die Antwort eines bereits entladenen Hosts', async () => {
    const lifecycle = { disposed: false }
    let finish!: (value: unknown) => void
    const apiCall = vi.fn(() => new Promise(resolve => { finish = resolve }))
    const { session } = await activate(apiCall, { lifecycle })
    const request = session.methods.refresh()
    lifecycle.disposed = true
    finish({ code: 0, data: { service: 'flugdeck', version: '0.3.0' } })
    await request
    await session.methods.refresh()
    expect(session.state.get().backend.checkedAt).toBeNull()
    expect(apiCall).toHaveBeenCalledTimes(1)
  })
})

describe('Cockpit: Telemetrie und automatisches Flugbuch', () => {
  beforeEach(() => view.handle.mockClear())

  it('zeigt Telemetrie, startet und beendet den Flug anhand der flightId', async () => {
    const pose = { source: 'ws', longitude: 8.5, latitude: 47.3, height: 10, elevation: null, attitude_head: null, horizontal_speed: 3, vertical_speed: 1, home_distance: 20 }
    const telemetryState = { drone: { pose }, control: { flight: { hasControl: true } } }
    const telemetry = fakeCapability(telemetryState)
    const cockpit = fakeCapability({ projectId: 'p-1', droneSn: 'SN1', flightId: null })
    const apiCall = vi.fn(async (_path: string, options: { body: { handler: string; input: Record<string, unknown> } }) => ({
      code: 0, data: { flightKey: 'f-1', projectId: 'p-1', droneSn: 'SN1', status: options.body.handler === 'flightlog.finish' ? 'finished' : 'active', startedAt: 1, finishedAt: 2, maxHeightM: 60, maxSpeedMs: 9, mediaRef: '' },
    }))
    const { session, teardown } = await activate(apiCall, { capabilities: { 'cockpit:telemetry': telemetry, 'cockpit:context': cockpit } })
    expect(session.state.get().telemetry).toMatchObject({ heightM: 10, horizontalSpeedMs: 3, homeDistanceM: 20, hasFlightControl: true })

    cockpit.emit({ projectId: 'p-1', droneSn: 'SN1', flightId: 'f-1' })
    await vi.waitFor(() => expect(apiCall).toHaveBeenCalledWith('/plugin/invoke', expect.objectContaining({ body: expect.objectContaining({ handler: 'flightlog.start' }) })))
    telemetry.emit({ source: 'drone', state: { ...telemetryState, drone: { pose: { ...pose, height: 60, horizontal_speed: 9 } } } })
    telemetry.emit({ source: 'drone', state: { ...telemetryState, drone: { pose: { ...pose, height: 30, horizontal_speed: 4 } } } })
    expect(session.state.get().flight).toMatchObject({ phase: 'recording', flightKey: 'f-1', maxHeightM: 60, maxSpeedMs: 9 })

    cockpit.emit({ projectId: 'p-1', droneSn: 'SN1', flightId: null })
    await vi.waitFor(() => expect(session.state.get().flight.lastFinished?.status).toBe('finished'))
    const finishCall = apiCall.mock.calls.find(call => call[1].body.handler === 'flightlog.finish')!
    expect(finishCall[1].body.input).toMatchObject({ flightKey: 'f-1', maxHeightM: 60, maxSpeedMs: 9 })
    expect(session.state.get().flight.phase).toBe('idle')
    await (teardown as { dispose: () => Promise<void> }).dispose()
  })

  it('bleibt ohne Telemetrie- und Kontext-Capability nutzbar', async () => {
    const { session, contribute } = await activate(vi.fn())
    expect(contribute).toHaveBeenCalled()
    expect(session.state.get().telemetry).toBeNull()
    expect(session.state.get().flight.phase).toBe('idle')
  })
})

describe('Einstieg', () => {
  it('ignoriert unbekannte Hosts', async () => {
    const { contribute, teardown } = await activate(vi.fn(), { host: 'unknown' })
    expect(contribute).not.toHaveBeenCalled()
    expect(teardown).toBeUndefined()
  })
})
