import { createStoreRecord, queryStore, updateStoreRecord } from './store'
import { msNum, msText } from './time'
import { optionalNumber, optionalText, requireText } from './validation'
import type { BusinessError } from './validation'
import type { StoreRecord } from 'fh2-plugin-sdk/backend'

const ENTITY = 'flugdeck_flight'
const LIST_LIMIT_MAX = 100

export type FlightInput = Readonly<Record<string, unknown>>

/** Antwortform eines Flugbuch-Eintrags; Zahlen sind ausgepackt, fehlende Werte null. */
export interface FlightEntry {
  readonly flightKey: string
  readonly projectId: string
  readonly droneSn: string
  readonly status: 'active' | 'finished'
  readonly startedAt: number | null
  readonly finishedAt: number | null
  readonly maxHeightM: number | null
  readonly maxSpeedMs: number | null
  readonly mediaRef: string
}

function numText (value: number | null): string {
  return value === null ? '' : String(Math.round(value * 10) / 10)
}

function numOrNull (value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function toEntry (record: StoreRecord): FlightEntry {
  return {
    flightKey: String(record.flight_key),
    projectId: String(record.project_id),
    droneSn: String(record.drone_sn),
    status: record.status === 'finished' ? 'finished' : 'active',
    startedAt: msNum(record.started_at_ms),
    finishedAt: msNum(record.finished_at_ms),
    maxHeightM: numOrNull(record.max_height_m),
    maxSpeedMs: numOrNull(record.max_speed_ms),
    mediaRef: String(record.media_ref ?? ''),
  }
}

function findFlight (flightKey: string): StoreRecord | undefined {
  return queryStore(ENTITY, { flight_key: { eq: flightKey } }, { limit: 1 }).list[0]
}

function requireFlight (flightKey: string): StoreRecord {
  const record = findFlight(flightKey)
  if (record === undefined) {
    throw { code: 'NOT_FOUND', message: 'Kein Flug mit flightKey ' + flightKey } satisfies BusinessError
  }
  return record
}

/** Legt den Flug idempotent an: ein zweiter Aufruf mit derselben flightKey liefert den bestehenden Eintrag. */
export function startFlight (input: FlightInput, nowMs: number): FlightEntry & { readonly created: boolean } {
  const got = createStoreRecord(ENTITY, {
    flight_key: requireText(input, 'flightKey'),
    project_id: requireText(input, 'projectId'),
    drone_sn: optionalText(input, 'droneSn'),
    status: 'active',
    started_at_ms: msText(optionalNumber(input, 'startedAt') ?? nowMs),
    finished_at_ms: '',
    max_height_m: '',
    max_speed_ms: '',
    media_ref: '',
  }, ['flight_key'])
  return { ...toEntry(got.record), created: got.created === true }
}

/** Schließt einen aktiven Flug ab; ein bereits abgeschlossener Flug bleibt unverändert. */
export function finishFlight (input: FlightInput, nowMs: number): FlightEntry {
  const flightKey = requireText(input, 'flightKey')
  requireFlight(flightKey)
  updateStoreRecord(ENTITY, { flight_key: { eq: flightKey }, status: { eq: 'active' } }, {
    status: 'finished',
    finished_at_ms: msText(optionalNumber(input, 'finishedAt') ?? nowMs),
    max_height_m: numText(optionalNumber(input, 'maxHeightM')),
    max_speed_ms: numText(optionalNumber(input, 'maxSpeedMs')),
  })
  return toEntry(requireFlight(flightKey))
}

/** Hängt einen Medienverweis (z. B. Ordnerpfad der Mediendateien) an den Flug. */
export function attachMedia (input: FlightInput): FlightEntry {
  const flightKey = requireText(input, 'flightKey')
  const mediaRef = requireText(input, 'mediaRef')
  requireFlight(flightKey)
  updateStoreRecord(ENTITY, { flight_key: { eq: flightKey } }, { media_ref: mediaRef })
  return toEntry(requireFlight(flightKey))
}

/** Neueste Flüge eines Projekts zuerst. */
export function listFlights (input: FlightInput): { readonly items: readonly FlightEntry[]; readonly total: number } {
  const projectId = requireText(input, 'projectId')
  const limit = Math.min(Math.max(Math.floor(optionalNumber(input, 'limit') ?? 50), 1), LIST_LIMIT_MAX)
  const page = queryStore(ENTITY, { project_id: { eq: projectId } }, {
    limit,
    orderBy: [{ field: 'started_at_ms', dir: 'desc' }],
  })
  return { items: page.list.map(toEntry), total: page.total }
}
