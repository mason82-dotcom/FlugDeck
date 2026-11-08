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

/** Der Flug, den der Tracker gerade führt; persisted = Backend hat start bestätigt. */
interface CurrentFlight {
  readonly key: string
  readonly startedAt: number
  persisted: boolean
}

const NO_PROJECT = 'Kein Projekt im Cockpit-Kontext; der Flug wird gespeichert, sobald eines bekannt ist.'

function maxOf (current: number | null, next: number | null): number | null {
  if (next === null) return current
  return current === null ? next : Math.max(current, next)
}

/**
 * Führt das Flugbuch automatisch: Eine neue flightId des Cockpits startet einen Eintrag,
 * ihr Wegfall (oder Wechsel) schließt ihn mit Maximalwerten ab.
 *
 * Alle Übergänge laufen nacheinander in einer Warteschlange und gleichen jeweils gegen den
 * zuletzt gemeldeten Kontext ab. So kann ein veralteter Kontext keinen Flug mehr starten, und
 * ein finish wartet immer auf die Antwort des zugehörigen start.
 */
export function createFlightTracker ({ api, now, onChange }: TrackerOptions) {
  let state = initialFlight
  let current: CurrentFlight | null = null
  let desired: FlightContext = { projectId: null, droneSn: null, flightId: null }
  let latest: TelemetryReadout | null = null
  let disposed = false
  let queue: Promise<void> = Promise.resolve()

  function set (patch: Partial<FlightTrackerState>) {
    state = { ...state, ...patch }
    if (!disposed) onChange(state)
  }

  async function persistStart (flight: CurrentFlight, context: FlightContext) {
    if (!context.projectId) {
      set({ phase: 'error', message: NO_PROJECT })
      return
    }
    try {
      await api.startFlight({ flightKey: flight.key, projectId: context.projectId, droneSn: context.droneSn ?? '', startedAt: flight.startedAt })
      flight.persisted = true
      if (current === flight) set({ phase: 'recording', message: '' })
    } catch (error) {
      if (current === flight) set({ phase: 'error', message: describeFailure(error) })
    }
  }

  async function finishCurrent () {
    const flight = current
    if (flight === null) return
    const { maxHeightM, maxSpeedMs } = state
    const finishedAt = now()
    current = null
    set({ phase: 'idle', flightKey: null, startedAt: null, maxHeightM: null, maxSpeedMs: null, message: '' })
    if (!flight.persisted) return
    try {
      const entry = await api.finishFlight({ flightKey: flight.key, finishedAt, maxHeightM, maxSpeedMs })
      set({ lastFinished: entry })
    } catch (error) {
      if (current === null) set({ phase: 'error', message: 'Flug konnte nicht abgeschlossen werden: ' + describeFailure(error) })
    }
  }

  async function reconcile () {
    const context = desired
    const target = context.flightId ?? null
    if (current !== null && current.key !== target) await finishCurrent()
    if (target === null) return
    if (current === null) {
      current = { key: target, startedAt: now(), persisted: false }
      // Startwerte aus der letzten Probe: der Host meldet Telemetrie nicht zwingend nach Flugbeginn erneut.
      set({
        phase: 'recording', flightKey: target, startedAt: current.startedAt,
        maxHeightM: latest?.heightM ?? null, maxSpeedMs: latest?.horizontalSpeedMs ?? null, message: '',
      })
      await persistStart(current, context)
    } else if (!current.persisted && context.projectId) {
      // Gleicher Flug, aber noch nicht gespeichert (Projekt kam später oder start schlug fehl): erneut versuchen.
      await persistStart(current, context)
    }
  }

  return {
    get: () => state,
    /** Neuer Cockpit-Kontext; das Promise erfüllt sich, wenn der Abgleich dafür erledigt ist. */
    update (context: FlightContext): Promise<void> {
      if (disposed) return queue
      desired = context
      queue = queue.then(reconcile, reconcile)
      return queue
    },
    /** Telemetrieprobe: führt während eines Flugs die Maximalwerte nach. */
    sample (readout: TelemetryReadout) {
      latest = readout
      if (disposed || state.flightKey === null) return
      const maxHeightM = maxOf(state.maxHeightM, readout.heightM)
      const maxSpeedMs = maxOf(state.maxSpeedMs, readout.horizontalSpeedMs)
      if (maxHeightM !== state.maxHeightM || maxSpeedMs !== state.maxSpeedMs) set({ maxHeightM, maxSpeedMs })
    },
    /** Wartet auf laufende Backend-Aufrufe (Tests, geordnetes Entladen). */
    settled: () => queue,
    /**
     * Beendet nur die Anzeige. Ein laufender Flug bleibt im Backend aktiv und wird beim nächsten
     * Öffnen mit derselben flightId weitergeführt (siehe docs/architecture.md, Abschnitt 4.2).
     */
    dispose () { disposed = true },
  }
}

export type FlightTracker = ReturnType<typeof createFlightTracker>
