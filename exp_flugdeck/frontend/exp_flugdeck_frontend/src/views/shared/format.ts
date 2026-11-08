const decimal = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1, minimumFractionDigits: 1 })
const coordinate = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 5, minimumFractionDigits: 5 })
const clock = new Intl.DateTimeFormat('de-DE', { timeStyle: 'medium' })
const dateTime = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' })

export const dash = '—'

export function unit (value: number | null, suffix: string): string {
  return value === null ? dash : decimal.format(value) + ' ' + suffix
}

export function position (latitude: number | null, longitude: number | null): string {
  return latitude === null || longitude === null ? dash : coordinate.format(latitude) + ', ' + coordinate.format(longitude)
}

export function time (value: number | null): string {
  return value === null ? dash : clock.format(value)
}

export function stamp (value: number | null): string {
  return value === null ? dash : dateTime.format(value)
}

export function duration (from: number | null, to: number | null): string {
  if (from === null || to === null || to < from) return dash
  const minutes = Math.round((to - from) / 60000)
  return minutes < 60 ? minutes + ' min' : Math.floor(minutes / 60) + ' h ' + (minutes % 60) + ' min'
}
