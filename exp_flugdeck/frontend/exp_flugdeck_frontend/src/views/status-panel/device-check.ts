/** Cloud API v1.20 release minima for the O4 external Dock 4 topology only. */
export const dock4Minimums = [
  { id: 'o4', name: 'O4 Ground Station', minimum: '19.01.00.58', role: 'Cloud-Gateway' },
  { id: 'dock4', name: 'DJI Dock 4', minimum: '19.01.00.07', role: 'Untergerät' },
  { id: 'm5td', name: 'Matrice 5TD', minimum: '19.01.00.07', role: 'Untergerät' },
] as const

export type DeviceId = typeof dock4Minimums[number]['id']
export type FirmwareResult = 'missing' | 'invalid' | 'below' | 'meets'
export type Dock4Status = 'unknown' | 'blocked' | 'compatible'

export const controllers = [
  { id: 'rc-pro', name: 'DJI RC Pro Enterprise' },
  { id: 'rc-plus-2', name: 'DJI RC Plus 2 Enterprise' },
] as const

export const aircraft = [
  { id: 'm3e', name: 'DJI Mavic 3E', controller: 'rc-pro', fh2Support: 'candidate', modules: ['Karte & Wegpunkte', 'RGB-Medien'] },
  { id: 'm3t', name: 'DJI Mavic 3T', controller: 'rc-pro', fh2Support: 'candidate', modules: ['Karte & Wegpunkte', 'RGB-Medien', 'Thermal-Medien'] },
  { id: 'm3m', name: 'DJI Mavic 3M', controller: 'rc-pro', fh2Support: 'unsupported', modules: ['Multispektral-Medien'] },
  { id: 'm4t', name: 'DJI Matrice 4T', controller: 'rc-plus-2', fh2Support: 'candidate', modules: ['Karte & Wegpunkte', 'RGB-Medien', 'Thermal-Medien'] },
] as const

export type ControllerId = typeof controllers[number]['id']
export type AircraftId = typeof aircraft[number]['id']
export type PairResult = 'unknown' | 'compatible' | 'incompatible'

export function inspectPair (controller: ControllerId | '', aircraftId: AircraftId | '') {
  const model = aircraft.find(item => item.id === aircraftId)
  const status: PairResult = !controller || !model ? 'unknown' : model.controller === controller ? 'compatible' : 'incompatible'
  return { status, model }
}

export function checkFirmware (observed: string, minimum: string): FirmwareResult {
  if (!observed.trim()) return 'missing'
  const pattern = /^\d{1,3}(?:\.\d{1,3}){3}$/
  if (!pattern.test(observed.trim())) return 'invalid'
  const actual = observed.trim().split('.').map(Number)
  const required = minimum.split('.').map(Number)
  for (let i = 0; i < required.length; i++) {
    if (actual[i]! > required[i]!) return 'meets'
    if (actual[i]! < required[i]!) return 'below'
  }
  return 'meets'
}

export function assessDock4 (mode: 'unknown' | 'external' | 'other', versions: Record<DeviceId, string>) {
  const devices = dock4Minimums.map(device => ({
    ...device, observed: versions[device.id], result: checkFirmware(versions[device.id], device.minimum),
  }))
  const status: Dock4Status = mode === 'other' || devices.some(device => device.result === 'below' || device.result === 'invalid')
    ? 'blocked' : mode === 'external' && devices.every(device => device.result === 'meets') ? 'compatible' : 'unknown'
  return { status, devices }
}
