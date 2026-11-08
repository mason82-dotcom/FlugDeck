import type { AdapterCtx, ConnectorApi, PlatformApi, StoreApi } from 'fh2-plugin-sdk/backend'
import { projectTopologies } from '../live/project-topologies'

declare const platform: PlatformApi
declare const connector: ConnectorApi
declare const store: StoreApi

export function handle (_input: Readonly<Record<string, unknown>>, ctx: AdapterCtx) {
  const config = platform.getConfig()
  const baseUrl = config.baseUrl
  const projectUuid = config.projectUuid
  const token = config.userToken
  if (typeof baseUrl !== 'string' || !/^https:\/\/[A-Za-z0-9.-]+(?::[0-9]{1,5})?\/?$/.test(baseUrl) ||
      typeof projectUuid !== 'string' || !/^[a-zA-Z0-9-]{8,64}$/.test(projectUuid) ||
      typeof token !== 'string' || !token.trim()) throw new Error('FlightHub-Verbindung nicht konfiguriert.')
  const response = connector.fetch({
    method: 'GET',
    url: baseUrl.replace(/\/$/, '') + '/openapi/v2.0/manage/api/v1/projects/' + encodeURIComponent(projectUuid) + '/topologies',
    headers: { 'x-user-token': token, 'X-Project-Uuid': projectUuid },
    timeoutSec: 10,
  })
  if (response.status !== 200) throw new Error('FlightHub-Topologie nicht verfügbar.')
  let payload: unknown
  try { payload = JSON.parse(response.body) } catch { throw new Error('Ungültige FlightHub-Antwort.') }
  const time = Date.parse(ctx.now)
  if (!Number.isSafeInteger(time)) throw new Error('Ungültige Abfragezeit.')
  const projected = projectTopologies(payload, time)
  const record = { slot: 'current', fetched_at_ms: String(time).padStart(13, '0'), payload: JSON.stringify(projected) }
  const created = store.createIfAbsent('live_snapshot', record, ['slot'])
  if (!created.ok) throw new Error('Live-Snapshot konnte nicht gespeichert werden.')
  if (!created.data.created) {
    const updated = store.update('live_snapshot', { slot: { eq: 'current' }, fetched_at_ms: { lt: record.fetched_at_ms } }, record)
    if (!updated.ok) throw new Error('Live-Snapshot konnte nicht aktualisiert werden.')
  }
  return { count: projected.devices.length }
}
