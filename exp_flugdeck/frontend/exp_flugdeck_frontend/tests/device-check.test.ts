import { expect, it } from 'vitest'
import { assessDock4, checkFirmware, inspectPair } from '../src/views/status-panel/device-check'

it('ordnet verfügbare Controller den Fluggeräten zu und meldet fehlende Auswahl', () => {
  expect(inspectPair('', 'm3e').status).toBe('unknown')
  for (const model of ['m3e', 'm3t', 'm3m'] as const) {
    expect(inspectPair('rc-pro', model).status).toBe('compatible')
    expect(inspectPair('rc-plus-2', model).status).toBe('incompatible')
  }
  expect(inspectPair('rc-plus-2', 'm4t').status).toBe('compatible')
  expect(inspectPair('rc-pro', 'm4t').status).toBe('incompatible')
  expect(inspectPair('rc-pro', 'm3m').model?.modules).toContain('Multispektral-Medien')
  expect(inspectPair('rc-pro', 'm3m').model?.fh2Support).toBe('unsupported')
})

it('vergleicht Firmware als vier numerische Komponenten und lehnt unklare Angaben ab', () => {
  expect(checkFirmware('19.01.00.58', '19.01.00.58')).toBe('meets')
  expect(checkFirmware('19.01.01.00', '19.01.00.58')).toBe('meets')
  expect(checkFirmware('19.01.00.57', '19.01.00.58')).toBe('below')
  expect(checkFirmware('19.01.00.8', '19.01.00.58')).toBe('below')
  expect(checkFirmware('', '19.01.00.58')).toBe('missing')
  expect(checkFirmware('19.01.00.58-beta', '19.01.00.58')).toBe('invalid')
})

it('fordert externen Modus und alle drei Mindestversionen für den Dock-4-Abgleich', () => {
  const versions = { o4: '19.01.00.58', dock4: '19.01.00.07', m5td: '19.01.00.07' }
  expect(assessDock4('unknown', versions).status).toBe('unknown')
  expect(assessDock4('other', versions).status).toBe('blocked')
  expect(assessDock4('external', { ...versions, dock4: '' }).status).toBe('unknown')
  expect(assessDock4('external', { ...versions, m5td: '19.01.00.06' }).status).toBe('blocked')
  expect(assessDock4('external', versions).status).toBe('compatible')
})
