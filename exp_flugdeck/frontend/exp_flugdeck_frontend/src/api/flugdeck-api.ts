import { isPluginError } from 'fh2-plugin-sdk'
import type { PluginContext } from 'fh2-plugin-sdk'

export const BACKEND_ID = 'exp_flugdeck_backend'
export const TIMEOUT_MS = 8000

type ApiCall = PluginContext['apiCall']

/** Spiegel von FlightEntry aus backend/shared/flightlog.ts. */
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

export interface FlightList {
  readonly items: readonly FlightEntry[]
  readonly total: number
}

export interface StartFlightInput {
  readonly flightKey: string
  readonly projectId: string
  readonly droneSn: string
  readonly startedAt: number
}

export interface FinishFlightInput {
  readonly flightKey: string
  readonly finishedAt: number
  readonly maxHeightM: number | null
  readonly maxSpeedMs: number | null
}

// Antwortumschlag des Gateways; data wird je Handler gesondert geprüft.
type Json = string | number | boolean | null | readonly Json[] | { readonly [key: string]: Json }
type JsonObject = { readonly [key: string]: Json }
type Envelope = JsonObject

export function describeFailure (error: unknown): string {
  if (isPluginError(error)) {
    if (error.code === 'TIMEOUT') return 'Innerhalb von ' + TIMEOUT_MS / 1000 + ' Sekunden kam keine Antwort.'
    const detail = error.detail
    if (detail && typeof detail === 'object' && 'gatewayCode' in detail && typeof detail.gatewayCode === 'number') {
      return error.message + ' (Gateway ' + detail.gatewayCode + ')'
    }
    return error.message
  }
  return error instanceof Error ? error.message : 'Backend-Anfrage fehlgeschlagen.'
}

function isObject (value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** Ruft Handler des Flugdeck-Backends über den DJI-Gateway auf und prüft den Antwortumschlag. */
export function createFlugdeckApi (apiCall: ApiCall) {
  async function invoke<T> (handler: string, input: JsonObject, isValid: (data: unknown) => data is T): Promise<T> {
    const response = await apiCall<Envelope>('/plugin/invoke', {
      method: 'POST',
      timeoutMs: TIMEOUT_MS,
      body: { pluginId: BACKEND_ID, handler, input },
    })
    if (!isObject(response)) throw new Error('Unerwartete Antwort vom Flugdeck-Backend.')
    if (response.code !== 0) {
      const message = response.message
      throw new Error(typeof message === 'string' && message ? message : 'Backend meldet Fehler ' + String(response.code) + '.')
    }
    if (!isValid(response.data)) throw new Error('Unerwartete Antwort vom Flugdeck-Backend.')
    return response.data
  }

  const isEntry = (data: unknown): data is FlightEntry => isObject(data) && typeof data.flightKey === 'string'
  const isList = (data: unknown): data is FlightList => isObject(data) && Array.isArray(data.items)

  return {
    status: () => invoke('flugdeck.status', {}, (data): data is { service: 'flugdeck'; version: string } =>
      isObject(data) && data.service === 'flugdeck' && typeof data.version === 'string' && data.version.trim() !== ''),
    startFlight: (input: StartFlightInput) => invoke('flightlog.start', { ...input }, isEntry),
    finishFlight: (input: FinishFlightInput) => invoke('flightlog.finish', { ...input }, isEntry),
    listFlights: (projectId: string, limit = 50) => invoke('flightlog.list', { projectId, limit }, isList),
  }
}

export type FlugdeckApi = ReturnType<typeof createFlugdeckApi>
