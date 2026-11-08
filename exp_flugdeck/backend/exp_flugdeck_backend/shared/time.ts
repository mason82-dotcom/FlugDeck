/** Millisekunden als 13-stelliger Text: nur bei fester Breite sortiert der Textvergleich numerisch. */
export function msText (value: number): string {
  const num = Math.floor(value)
  return Number.isFinite(num) && num > 0 ? String(num).padStart(13, '0') : ''
}

export function msNum (value: unknown): number | null {
  const num = Math.floor(Number(value))
  return Number.isFinite(num) && num > 0 ? num : null
}

/** ctx.now ist Text; akzeptiert ISO-Zeitpunkt oder Millisekunden, sonst Systemzeit. */
export function nowMs (now: string): number {
  const numeric = Number(now)
  if (Number.isFinite(numeric) && numeric > 0) return numeric
  const parsed = Date.parse(now)
  return Number.isFinite(parsed) ? parsed : Date.now()
}
