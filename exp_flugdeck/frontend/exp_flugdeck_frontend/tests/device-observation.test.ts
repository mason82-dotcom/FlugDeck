import { expect, it } from 'vitest'
import { fixtureSnapshot, observeSnapshot, parseDeviceSnapshot } from '../src/views/status-panel/device-observation'

const now = 1_800_000_000_000

it('trennt frische Topologie und OSD und macht veraltete Beobachtungen unbekannt', () => {
  const sample = fixtureSnapshot(now)
  const rows = observeSnapshot(sample, now)
  expect(rows.find(row => row.model === 'm3e')).toMatchObject({ online: 'online', osd: 'fresh', source: 'fixture' })
  expect(rows.find(row => row.model === 'm4t')).toMatchObject({ online: 'online', osd: 'unknown' })
  expect(observeSnapshot(sample, now + 11_000).find(row => row.model === 'm3e')).toMatchObject({ online: 'online', osd: 'unknown' })
  expect(observeSnapshot(sample, now + 61_000).find(row => row.model === 'm3e')).toMatchObject({ online: 'unknown', osd: 'unknown' })
})

it('verwirft Fluggerätedaten bei veraltetem oder offline gemeldetem Gateway', () => {
  const sample = fixtureSnapshot(now)
  const devices = sample.devices.map(device => device.model === 'rc-pro' ? { ...device, online: false } : device)
  expect(observeSnapshot({ ...sample, devices }, now).find(row => row.model === 'm3e')).toMatchObject({ online: 'unknown', osd: 'unknown' })
})

it('normalisiert nur erlaubte Felder und behandelt M3M in FlightHub 2 als nicht unterstützt', () => {
  const raw = JSON.stringify({ schemaVersion: 1, source: 'live', token: 'must-not-survive', devices: [
    { key: 'test-rc', model: 'rc-pro', gatewayKey: null, online: true, topologyAt: now, osdAt: now, serial: 'must-not-survive' },
    { key: 'test-m3m', model: 'm3m', gatewayKey: 'test-rc', online: true, topologyAt: now, osdAt: now },
  ] })
  const parsed = parseDeviceSnapshot(raw)
  expect(parsed.source).toBe('manual')
  expect(JSON.stringify(parsed)).not.toContain('must-not-survive')
  expect(observeSnapshot(parsed, now)[1]).toMatchObject({ support: 'unsupported', online: 'unknown', osd: 'unknown' })
})

it('lehnt unbekannte Modelle, doppelte Kennungen, kaputte Topologie und ungültige Zeitwerte ab', () => {
  const valid = { schemaVersion: 1, devices: [{ key: 'test-rc', model: 'rc-pro', gatewayKey: null, online: true, topologyAt: now, osdAt: null }] }
  expect(() => parseDeviceSnapshot('{')).toThrow('Ungültiges JSON')
  expect(() => parseDeviceSnapshot(JSON.stringify({ ...valid, devices: [...valid.devices, valid.devices[0]] }))).toThrow('eindeutig')
  expect(() => parseDeviceSnapshot(JSON.stringify({ ...valid, devices: [{ ...valid.devices[0], model: 'other' }] }))).toThrow('unbekanntes Modell')
  expect(() => parseDeviceSnapshot(JSON.stringify({ ...valid, devices: [{ key: 'test-m4t', model: 'm4t', gatewayKey: 'missing', online: true, topologyAt: now, osdAt: now }] }))).toThrow('Gateway')
  expect(() => parseDeviceSnapshot(JSON.stringify({ ...valid, devices: [...valid.devices, { key: 'test-m4t', model: 'm4t', gatewayKey: 'test-rc', online: true, topologyAt: now, osdAt: now }] }))).toThrow('Hardwarekombination')
  expect(() => parseDeviceSnapshot(JSON.stringify({ ...valid, devices: [{ ...valid.devices[0], osdAt: Number.MAX_SAFE_INTEGER + 1 }] }))).toThrow('ungültige Felder')
  expect(() => parseDeviceSnapshot(' '.repeat(16_385))).toThrow('zu groß')
})
