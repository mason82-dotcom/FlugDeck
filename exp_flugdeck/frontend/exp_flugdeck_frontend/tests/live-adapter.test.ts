import { afterEach, expect, it, vi } from 'vitest'
import { projectTopologies } from '../../../backend/exp_flugdeck_backend/live/project-topologies'
import { handle } from '../../../backend/exp_flugdeck_backend/adapters/read-devices'
import { devices } from '../../../backend/exp_flugdeck_backend/handlers/flugdeck/devices'

const now = Date.parse('2026-11-08T19:00:00.000Z')
const topology = { code: 0, data: { list: [{
  host: { device_sn: 'AIRCRAFT-SENSITIVE', device_model: { name: 'Mavic 3E' }, device_online_status: true, is_device_pending_offline: false },
  parents: [{ device_sn: 'CONTROLLER-SENSITIVE', device_model: { name: 'DJI RC Pro Enterprise' }, device_online_status: true, is_device_pending_offline: false }],
}] } }
afterEach(() => vi.unstubAllGlobals())

it('projiziert nur Modell, Status und anonyme Verknüpfung ohne Seriennummern', () => {
  const result = projectTopologies(topology, now)
  expect(result.source).toBe('live')
  expect(result.devices).toHaveLength(2)
  expect(result.devices.find(row => row.model === 'm3e')?.gatewayKey).toBe(result.devices.find(row => row.model === 'rc-pro')?.key)
  expect(result.devices.every(row => row.osdAt === null)).toBe(true)
  expect(JSON.stringify(result)).not.toContain('SENSITIVE')
})

it('verwirft Pending-offline, unbekannte Modelle und fehlerhafte Geschäftscodes', () => {
  expect(() => projectTopologies({ ...topology, code: 403 }, now)).toThrow('Ungültige')
  const pending = structuredClone(topology)
  pending.data.list[0]!.host.is_device_pending_offline = true
  expect(projectTopologies(pending, now).devices.find(row => row.model === 'm3e')?.online).toBeNull()
  const m3m = structuredClone(topology)
  m3m.data.list[0]!.host.device_model.name = 'Mavic 3M'
  expect(JSON.stringify(projectTopologies(m3m, now))).not.toContain('m3m')
})

it('ruft ausschließlich GET mit serverseitigem Token ab und speichert nur die Projektion', () => {
  const fetch = vi.fn().mockReturnValue({ status: 200, body: JSON.stringify(topology) })
  const createIfAbsent = vi.fn().mockReturnValue({ ok: true, data: { created: true } })
  vi.stubGlobal('platform', { getConfig: () => ({ baseUrl: 'https://fh.example.test', projectUuid: 'test-project-001', userToken: 'SECRET' }) })
  vi.stubGlobal('connector', { fetch })
  vi.stubGlobal('store', { createIfAbsent })
  expect(handle({}, { now: new Date(now).toISOString() } as never)).toEqual({ count: 2 })
  expect(fetch).toHaveBeenCalledWith(expect.objectContaining({ method: 'GET', url: 'https://fh.example.test/openapi/v2.0/manage/api/v1/projects/test-project-001/topologies', headers: expect.objectContaining({ 'x-user-token': 'SECRET' }) }))
  expect(JSON.stringify(createIfAbsent.mock.calls)).not.toContain('SECRET')
  expect(JSON.stringify(createIfAbsent.mock.calls)).not.toContain('SENSITIVE')
})

it('liefert nur frische gespeicherte Snapshots und verwirft alte Antworten', () => {
  const snapshot = projectTopologies(topology, now)
  vi.stubGlobal('store', { query: () => ({ ok: true, data: { list: [{ payload: JSON.stringify(snapshot), fetched_at_ms: String(now) }] } }) })
  expect(devices({}, { now: new Date(now + 30_000).toISOString() } as never)).toMatchObject({ source: 'live' })
  expect(JSON.stringify(devices({}, { now: new Date(now + 30_000).toISOString() } as never))).not.toContain('SENSITIVE')
  expect(devices({}, { now: new Date(now + 61_000).toISOString() } as never)).toEqual({ source: 'stale', fetchedAt: now, devices: [] })
})
