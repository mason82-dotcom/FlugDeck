import { beforeEach, describe, expect, it } from 'vitest'
import { start } from '../handlers/flightlog/start'
import { finish } from '../handlers/flightlog/finish'
import { list } from '../handlers/flightlog/list'
import { attachMedia } from '../handlers/flightlog/attach-media'
import { status } from '../handlers/flugdeck/status'

type Row = Record<string, string>
type Cond = { eq: string }

/** Speicher im Arbeitsspeicher mit der Teilmenge der store-API, die das Backend nutzt. */
function memoryStore () {
  const rows: Row[] = []
  const match = (row: Row, filter: Record<string, Cond> = {}) => Object.entries(filter).every(([key, cond]) => row[key] === cond.eq)
  return {
    rows,
    query (_entity: string, filter: Record<string, Cond>, options: { limit?: number; orderBy?: { field: string; dir?: string }[] } = {}) {
      let list = rows.filter(row => match(row, filter))
      const order = options.orderBy?.[0]
      if (order) list = [...list].sort((a, b) => (a[order.field]! < b[order.field]! ? -1 : 1) * (order.dir === 'desc' ? -1 : 1))
      return { ok: true, data: { list: list.slice(0, options.limit ?? 50), total: list.length } }
    },
    createIfAbsent (_entity: string, record: Row, uniqueBy: string[]) {
      const existing = rows.find(row => uniqueBy.every(key => row[key] === record[key]))
      if (existing) return { ok: true, data: { created: false, record: existing } }
      const row = { id: String(rows.length + 1), ...record }
      rows.push(row)
      return { ok: true, data: { created: true, record: row } }
    },
    update (_entity: string, filter: Record<string, Cond>, patch: Row) {
      const hits = rows.filter(row => match(row, filter))
      for (const row of hits) Object.assign(row, patch)
      return { ok: true, data: { affected: hits.length } }
    },
  }
}

const ctx = (now: string) => ({ now, pluginVersion: '0.3.0', idempotencyKey: '', requestId: 'r', scriptId: '', stableId: () => '' })

describe('Flugbuch-Handler', () => {
  let store: ReturnType<typeof memoryStore>
  beforeEach(() => { store = memoryStore(); (globalThis as Record<string, unknown>).store = store })

  it('legt Flüge idempotent an, schließt sie einmal ab und listet neueste zuerst', () => {
    const first = start({ flightKey: 'f-1', projectId: 'p', droneSn: 'SN', startedAt: 1_700_000_000_000 }, ctx('2026-11-08T10:00:00Z'))
    expect(first).toMatchObject({ created: true, status: 'active', startedAt: 1_700_000_000_000 })
    expect(store.rows[0]!.started_at_ms).toBe('1700000000000')
    expect(start({ flightKey: 'f-1', projectId: 'p' }, ctx('0')).created).toBe(false)

    const done = finish({ flightKey: 'f-1', maxHeightM: 61.26, maxSpeedMs: 9 }, ctx('1700000600000'))
    expect(done).toMatchObject({ status: 'finished', finishedAt: 1_700_000_600_000, maxHeightM: 61.3, maxSpeedMs: 9 })
    expect(finish({ flightKey: 'f-1', maxHeightM: 1 }, ctx('1700000900000'))).toMatchObject({ finishedAt: 1_700_000_600_000, maxHeightM: 61.3 })

    start({ flightKey: 'f-2', projectId: 'p', startedAt: 1_800_000_000_000 }, ctx('0'))
    start({ flightKey: 'f-3', projectId: 'q', startedAt: 1_900_000_000_000 }, ctx('0'))
    const page = list({ projectId: 'p' }, ctx('0'))
    expect(page.total).toBe(2)
    expect(page.items.map(item => item.flightKey)).toEqual(['f-2', 'f-1'])
  })

  it('hängt Medienverweise an und meldet unbekannte Flüge und fehlende Pflichtfelder', () => {
    start({ flightKey: 'f-1', projectId: 'p' }, ctx('2026-11-08T10:00:00Z'))
    expect(attachMedia({ flightKey: 'f-1', mediaRef: '/media/2026-11-08' }, ctx('0')).mediaRef).toBe('/media/2026-11-08')
    expect(() => attachMedia({ flightKey: 'f-x', mediaRef: 'x' }, ctx('0'))).toThrow(expect.objectContaining({ code: 'NOT_FOUND' }))
    expect(() => start({ projectId: 'p' }, ctx('0'))).toThrow(expect.objectContaining({ code: 'INVALID_ARGUMENT' }))
    expect(() => finish({ flightKey: 'f-1', maxHeightM: -1 }, ctx('0'))).toThrow(expect.objectContaining({ code: 'INVALID_ARGUMENT' }))
    expect(() => list({}, ctx('0'))).toThrow(expect.objectContaining({ code: 'INVALID_ARGUMENT' }))
  })

  it('macht Speicherfehler zu Handler-Fehlern', () => {
    store.createIfAbsent = () => ({ ok: false, error: { code: 'STORAGE_ERROR', message: 'Tabelle fehlt' } }) as never
    expect(() => start({ flightKey: 'f-1', projectId: 'p' }, ctx('0'))).toThrow(expect.objectContaining({ code: 'INTERNAL', message: expect.stringContaining('Tabelle fehlt') }))
  })

  it('meldet Dienst und Plugin-Version', () => {
    expect(status({}, ctx('0'))).toEqual({ service: 'flugdeck', version: '0.3.0' })
  })
})
