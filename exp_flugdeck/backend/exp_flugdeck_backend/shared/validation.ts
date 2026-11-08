/** Fachlicher Fehler: wird von der Plattform unverändert als Fehlerantwort weitergegeben. */
export interface BusinessError {
  readonly code: string
  readonly message: string
}

export function requireText (input: Readonly<Record<string, unknown>>, key: string): string {
  const value = optionalText(input, key)
  if (value === '') {
    throw { code: 'INVALID_ARGUMENT', message: key + ' darf nicht leer sein' } satisfies BusinessError
  }
  return value
}

export function optionalText (input: Readonly<Record<string, unknown>>, key: string): string {
  const raw = input[key]
  return raw === undefined || raw === null ? '' : String(raw).trim()
}

/** Endliche, nicht negative Zahl oder null, wenn das Feld fehlt. */
export function optionalNumber (input: Readonly<Record<string, unknown>>, key: string): number | null {
  const raw = input[key]
  if (raw === undefined || raw === null || raw === '') return null
  const value = Number(raw)
  if (!Number.isFinite(value) || value < 0) {
    throw { code: 'INVALID_ARGUMENT', message: key + ' muss eine Zahl ≥ 0 sein' } satisfies BusinessError
  }
  return value
}
