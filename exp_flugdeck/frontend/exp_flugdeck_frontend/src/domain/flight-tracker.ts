import { describeFailure } from '../api/flugdeck-api'
import type { FlightEntry, FlugdeckApi } from '../api/flugdeck-api'
import type { TelemetryReadout } from './telemetry'

export interface FlightTrackerState {
  /** idle: kein Flug; recording: Flug läuft; error: letzte Speicherung fehlgeschlagen. */
  readonly phase: 'idle' | 'recording' | 'error'
  readonly flightKey: string | null
  readonly startedAt: number | null
  readonly maxHeightM: number | null
  readonly maxSpeedMs: number | null
  readonly lastFinished: FlightEntry | null
  readonly message: string
}

export const initialFlight: FlightTrackerState = {
  phase: 'idle', flightKey: null, startedAt: null, maxHeightM: null, maxSpeedMs: null, lastFinished: null, message: '',
}

export interface FlightContext {
  readonly projectId: string | null
  readonly droneSn: string | null
  readonly flightId?: string | null | undefined
}

interface TrackerOptions {
  readonly api: Pick<FlugdeckApi, 'startFlight' | 'finishFlight'>
  readonly now: () => number
  readonly onChange: (state: FlightTrackerState) => void
}

function maxOf (current: number | null, next: number | null): number | null {
  if (next === null) return current
  return current === null ? next : Math.max(current, next)
}

/**
 * Führt das Flugbuch automatisch: Eine neue flightId des Cockpits startet einen Eintrag,
 * ihr Wegfall (oder Wechsel) schließt ihn mit Maximalhöhe und -geschwindigkeit ab.
 * Backend-Aufrufe laufen nacheinander, damit start und finish nie überholen.
 */
export function createFlightTracker ({ api, now, onChange }: TrackerOptions) {
  let state = initialFlight
  let persisted = false
  let latest: TelemetryReadout | null = null
  let disposed = false
  let queue: Promise<void> = Promise.resolve()

  function set (patch: Partial<FlightTrackerState>) {
    state = { ...state, ...patch }
    if (!disposed) onChange(state)
  }

  function enqueue (task: () => Promise<void>): Promise<void> {
    queue = queue.then(task, task)
    return queue
  }

  function begin (flightKey: string, context: FlightContext) {
    const startedAt = now()
    persisted = false
    // Startwerte aus der letzten Probe: der Host meldet Telemetrie nicht zwingend nach dem Flugbeginn erneut.
    set({ phase: 'recording', flightKey, startedAt, maxHeightM: latest?.heightM ?? null, maxSpeedMs: latest?.horizontalSpeedMs ?? null, message: '' })
    if (!context.projectId) {
      set({ phase: 'error', message: 'Kein Projekt im Cockpit-Kontext; der Flug wird nicht gespeichert.' })
      return Promise.resolve()
    }
    const projectId = context.projectId
    return enqueue(async () => {
      try {
        await api.startFlight({ flightKey, projectId, droneSn: context.droneSn ?? '', startedAt })
        persisted = true
      } catch (error) {
        if (state.flightKey === flightKey) set({ phase: 'error', message: describeFailure(error) })
      }
    })
  }

  function end () {
    const { flightKey, maxHeightM, maxSpeedMs } = state
    if (flightKey === null) return Promise.resolve()
    const wasPersisted = persisted
    const finishedAt = now()
    persisted = false
    set({ phase: 'idle', flightKey: null, startedAt: null })
    return enqueue(async () => {
      if (!wasPersisted) return
      try {
        const entry = await api.finishFlight({ flightKey, finishedAt, maxHeightM, maxSpeedMs })
        set({ lastFinished: entry, message: '' })
      } catch (error) {
        set({ phase: state.flightKey === null ? 'error' : state.phase, message: describeFailure(error) })
      }
    })
  }

  return {
    get: () => state,
    /** Neuer Cockpit-Kontext: erkennt Flugbeginn, -ende und Wechsel anhand von flightId. */
    async update (context: FlightContext): Promise<void> {
      if (disposed) return
      const flightId = context.flightId ?? null
      if (flightId === state.flightKey) return
      if (state.flightKey !== null) await end()
      if (flightId !== null) await begin(flightId, context)
    },
    /** Telemetrieprobe während eines Flugs: führt die Maximalwerte nach. */
    sample (readout: TelemetryReadout) {
      latest = readout
      if (disposed || state.flightKey === null) return
      const maxHeightM = maxOf(state.maxHeightM, readout.heightM)
      const maxSpeedMs = maxOf(state.maxSpeedMs, readout.horizontalSpeedMs)
      if (maxHeightM !== state.maxHeightM || maxSpeedMs !== state.maxSpeedMs) set({ maxHeightM, maxSpeedMs })
    },
    /** Wartet auf laufende Backend-Aufrufe (Tests, geordnetes Entladen). */
    settled: () => queue,
    dispose () { disposed = true },
  }
}

export type FlightTracker = ReturnType<typeof createFlightTracker>
