import { describe, expect, it, vi } from 'vitest'
import { createFlightTracker } from '../src/domain/flight-tracker'
import { emptyReadout } from '../src/domain/telemetry'

function setup (overrides: Partial<{ startFlight: ReturnType<typeof vi.fn>; finishFlight: ReturnType<typeof vi.fn> }> = {}) {
  let clock = 1000
  const api = {
    startFlight: overrides.startFlight ?? vi.fn().mockResolvedValue({}),
    finishFlight: overrides.finishFlight ?? vi.fn(async (input: { flightKey: string }) => ({ flightKey: input.flightKey, status: 'finished' })),
  }
  const onChange = vi.fn()
  const tracker = createFlightTracker({ api: api as never, now: () => (clock += 1000), onChange })
  return { api, tracker, onChange }
}

describe('Flugbuch-Erkennung', () => {
  it('ignoriert Kontextwechsel ohne flightId', async () => {
    const { api, tracker } = setup()
    await tracker.update({ projectId: 'p', droneSn: 'SN', flightId: null })
    await tracker.update({ projectId: 'p', droneSn: 'SN' })
    expect(api.startFlight).not.toHaveBeenCalled()
    expect(tracker.get().phase).toBe('idle')
  })

  it('schließt bei einem flightId-Wechsel den alten Flug vor dem neuen ab', async () => {
    const order: string[] = []
    const { tracker } = setup({
      startFlight: vi.fn(async (input: { flightKey: string }) => { order.push('start ' + input.flightKey) }),
      finishFlight: vi.fn(async (input: { flightKey: string }) => { order.push('finish ' + input.flightKey); return { flightKey: input.flightKey } }),
    })
    await tracker.update({ projectId: 'p', droneSn: 'SN', flightId: 'a' })
    await tracker.update({ projectId: 'p', droneSn: 'SN', flightId: 'b' })
    await tracker.settled()
    expect(order).toEqual(['start a', 'finish a', 'start b'])
    expect(tracker.get().flightKey).toBe('b')
  })

  it('speichert ohne Projekt nichts und meldet den Grund', async () => {
    const { api, tracker } = setup()
    await tracker.update({ projectId: null, droneSn: 'SN', flightId: 'a' })
    expect(api.startFlight).not.toHaveBeenCalled()
    expect(tracker.get()).toMatchObject({ phase: 'error', message: expect.stringContaining('Kein Projekt') })
    await tracker.update({ projectId: null, droneSn: 'SN', flightId: null })
    await tracker.settled()
    expect(api.finishFlight).not.toHaveBeenCalled()
  })

  it('meldet Startfehler und versucht dann keinen Abschluss', async () => {
    const { api, tracker } = setup({ startFlight: vi.fn().mockRejectedValue(new Error('Speicher voll')) })
    await tracker.update({ projectId: 'p', droneSn: 'SN', flightId: 'a' })
    expect(tracker.get()).toMatchObject({ phase: 'error', message: 'Speicher voll' })
    await tracker.update({ projectId: 'p', droneSn: 'SN', flightId: null })
    await tracker.settled()
    expect(api.finishFlight).not.toHaveBeenCalled()
  })

  it('führt Maximalwerte nur während eines Flugs und ignoriert fehlende Werte', async () => {
    const { tracker } = setup()
    tracker.sample({ ...emptyReadout, heightM: 99 })
    expect(tracker.get().maxHeightM).toBeNull()
    tracker.sample(emptyReadout)
    await tracker.update({ projectId: 'p', droneSn: 'SN', flightId: 'a' })
    tracker.sample({ ...emptyReadout, heightM: 12, horizontalSpeedMs: 4 })
    tracker.sample({ ...emptyReadout, heightM: null, horizontalSpeedMs: 6 })
    tracker.sample({ ...emptyReadout, heightM: 8 })
    expect(tracker.get()).toMatchObject({ maxHeightM: 12, maxSpeedMs: 6 })
  })

  it('übernimmt die letzte Telemetrieprobe vor dem Flugbeginn als Startwert', async () => {
    const { tracker } = setup()
    tracker.sample({ ...emptyReadout, heightM: 82, horizontalSpeedMs: 6 })
    await tracker.update({ projectId: 'p', droneSn: 'SN', flightId: 'a' })
    expect(tracker.get()).toMatchObject({ maxHeightM: 82, maxSpeedMs: 6 })
  })

  it('meldet nach dispose keine Änderungen mehr', async () => {
    const { tracker, onChange } = setup()
    tracker.dispose()
    await tracker.update({ projectId: 'p', droneSn: 'SN', flightId: 'a' })
    expect(onChange).not.toHaveBeenCalled()
  })
})
