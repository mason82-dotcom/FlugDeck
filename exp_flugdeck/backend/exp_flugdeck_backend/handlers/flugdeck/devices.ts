import type { HandlerCtx, StoreApi } from 'fh2-plugin-sdk/backend'

declare const store: StoreApi

export function devices (_input: Readonly<Record<string, unknown>>, ctx: HandlerCtx) {
  const page = store.query('live_snapshot', { slot: { eq: 'current' } }, { limit: 1 })
  if (!page.ok) throw new Error('Gerätestand nicht verfügbar.')
  const row = page.data.list[0]
  if (!row) return { source: 'unconfigured', fetchedAt: null, devices: [] }
  const time = Number(row.fetched_at_ms)
  const now = Date.parse(ctx.now)
  if (!Number.isSafeInteger(time) || !Number.isSafeInteger(now) || time > now + 5000 || now - time > 60000) {
    return { source: 'stale', fetchedAt: Number.isSafeInteger(time) ? time : null, devices: [] }
  }
  let snapshot: unknown
  try { snapshot = JSON.parse(row.payload ?? '') } catch { throw new Error('Ungültiger Gerätestand.') }
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) throw new Error('Ungültiger Gerätestand.')
  const candidate = snapshot as { source?: unknown; fetchedAt?: unknown; devices?: unknown }
  if (candidate.source !== 'live' || candidate.fetchedAt !== time || !Array.isArray(candidate.devices) || candidate.devices.length > 20) {
    throw new Error('Ungültiger Gerätestand.')
  }
  const allowed = new Set(['rc-pro', 'rc-plus-2', 'm3e', 'm3t', 'm4t'])
  const sanitized = candidate.devices.map((entry: unknown) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error('Ungültiger Gerätestand.')
    const device = entry as Record<string, unknown>
    if (typeof device.key !== 'string' || !/^live-device-\d{1,2}$/.test(device.key) || !allowed.has(String(device.model)) ||
      (device.gatewayKey !== null && (typeof device.gatewayKey !== 'string' || !/^live-device-\d{1,2}$/.test(device.gatewayKey))) ||
      (device.online !== null && typeof device.online !== 'boolean')) throw new Error('Ungültiger Gerätestand.')
    return { key: device.key, model: device.model, gatewayKey: device.gatewayKey,
      online: device.online, topologyAt: time, osdAt: null }
  })
  return { schemaVersion: 1, source: 'live', fetchedAt: time, devices: sanitized }
}
