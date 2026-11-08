import { aircraft, controllers } from './device-check'
import type { AircraftId, ControllerId } from './device-check'

export type ModelId = ControllerId | AircraftId
export type ObservationSource = 'fixture' | 'manual'
export interface DeviceObservation {
  key: string
  model: ModelId
  gatewayKey: string | null
  online: boolean | null
  topologyAt: number | null
  osdAt: number | null
}
export interface DeviceSnapshot {
  schemaVersion: 1
  source: ObservationSource
  devices: readonly DeviceObservation[]
}
export type OnlineState = 'online' | 'offline' | 'unknown'
export type OsdState = 'fresh' | 'unknown'

const models = new Set<string>([...controllers.map(item => item.id), ...aircraft.map(item => item.id)])
const controllerModels = new Set<string>(controllers.map(item => item.id))
const keyPattern = /^[a-z][a-z0-9-]{1,31}$/
const maxInputBytes = 16_384
const topologyMaxAgeMs = 60_000
const osdMaxAgeMs = 10_000
const futureToleranceMs = 5_000

function record (value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function stamp (value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0)
}

/** Only the normalized, allowlisted fields leave this parser; raw input is never retained. */
export function parseDeviceSnapshot (json: string): DeviceSnapshot {
  if (new TextEncoder().encode(json).length > maxInputBytes) throw new Error('Import ist zu groß (maximal 16 KiB).')
  let value: unknown
  try { value = JSON.parse(json) } catch { throw new Error('Ungültiges JSON.') }
  if (!record(value) || value.schemaVersion !== 1 || !Array.isArray(value.devices) || value.devices.length < 1 || value.devices.length > 20) {
    throw new Error('Erwartet: schemaVersion 1 und 1 bis 20 Geräte.')
  }
  const devices: DeviceObservation[] = value.devices.map((entry: unknown) => {
    if (!record(entry) || typeof entry.key !== 'string' || !keyPattern.test(entry.key) || !models.has(String(entry.model)) ||
      (entry.gatewayKey !== null && (typeof entry.gatewayKey !== 'string' || !keyPattern.test(entry.gatewayKey))) ||
      (entry.online !== null && typeof entry.online !== 'boolean') || !stamp(entry.topologyAt) || !stamp(entry.osdAt)) {
      throw new Error('Gerätedaten enthalten ungültige Felder oder ein unbekanntes Modell.')
    }
    return { key: entry.key, model: entry.model as ModelId, gatewayKey: entry.gatewayKey as string | null,
      online: entry.online, topologyAt: entry.topologyAt, osdAt: entry.osdAt }
  })
  const byKey = new Map(devices.map(device => [device.key, device]))
  if (byKey.size !== devices.length) throw new Error('Gerätekennungen müssen eindeutig sein.')
  for (const device of devices) {
    const isController = controllerModels.has(device.model)
    if (isController && device.gatewayKey !== null) throw new Error('Controller dürfen kein Gateway referenzieren.')
    if (!isController && (!device.gatewayKey || !controllerModels.has(byKey.get(device.gatewayKey)?.model ?? ''))) {
      throw new Error('Fluggeräte benötigen einen vorhandenen Controller als Gateway.')
    }
    if (!isController && aircraft.find(model => model.id === device.model)?.controller !== byKey.get(device.gatewayKey!)?.model) {
      throw new Error('Controller und Fluggerät bilden keine unterstützte Hardwarekombination.')
    }
  }
  return { schemaVersion: 1, source: 'manual', devices }
}

export function fixtureSnapshot (now: number): DeviceSnapshot {
  return {
    schemaVersion: 1, source: 'fixture', devices: [
      { key: 'demo-rc-pro', model: 'rc-pro', gatewayKey: null, online: true, topologyAt: now, osdAt: now },
      { key: 'demo-m3e', model: 'm3e', gatewayKey: 'demo-rc-pro', online: true, topologyAt: now, osdAt: now },
      { key: 'demo-rc-plus-2', model: 'rc-plus-2', gatewayKey: null, online: true, topologyAt: now, osdAt: null },
      { key: 'demo-m4t', model: 'm4t', gatewayKey: 'demo-rc-plus-2', online: true, topologyAt: now, osdAt: null },
    ],
  }
}

function recent (timestamp: number | null, now: number, maxAge: number): boolean {
  return timestamp !== null && timestamp <= now + futureToleranceMs && timestamp >= now - maxAge
}

export function observeSnapshot (snapshot: DeviceSnapshot, now: number) {
  const byKey = new Map(snapshot.devices.map(device => [device.key, device]))
  return snapshot.devices.map(device => {
    let online: OnlineState = recent(device.topologyAt, now, topologyMaxAgeMs) && device.online !== null
      ? device.online ? 'online' : 'offline' : 'unknown'
    if (device.gatewayKey) {
      const gateway = byKey.get(device.gatewayKey)
      if (!gateway || !recent(gateway.topologyAt, now, topologyMaxAgeMs) || gateway.online !== true) online = 'unknown'
    }
    // FlightHub 2 support for M3M is unavailable in this project; never promote imported values to live status.
    if (device.model === 'm3m') online = 'unknown'
    const osd: OsdState = online === 'online' && recent(device.osdAt, now, osdMaxAgeMs) ? 'fresh' : 'unknown'
    const name = [...controllers, ...aircraft].find(model => model.id === device.model)?.name ?? device.model
    return { ...device, name, online, osd, source: snapshot.source, support: device.model === 'm3m' ? 'unsupported' : 'candidate' }
  })
}
