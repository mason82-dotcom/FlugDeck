import type { Filter, QueryOptions, QueryPage, StoreFields, StoreRecord, StoreResult } from 'fh2-plugin-sdk/backend'

/** store meldet Fehler als Umschlag; erst ein throw macht daraus eine fehlgeschlagene Antwort. */
function unwrap<T> (what: string, result: StoreResult<T>): T {
  if (result.ok === true) return result.data
  throw { code: 'INTERNAL', message: what + ' fehlgeschlagen (' + result.error.code + '): ' + result.error.message }
}

export function queryStore (entity: string, filter: Filter<StoreRecord> = {}, options: QueryOptions<StoreRecord> = {}): QueryPage {
  return unwrap('Abfrage ' + entity, store.query(entity, filter, options))
}

export function createStoreRecord (entity: string, record: StoreFields, uniqueBy: readonly string[]): { created: boolean; record: StoreRecord } {
  return unwrap('Schreiben ' + entity, store.createIfAbsent(entity, record, uniqueBy))
}

export function updateStoreRecord (entity: string, filter: Filter<StoreRecord>, patch: Partial<StoreFields>): number {
  return unwrap('Aktualisieren ' + entity, store.update(entity, filter, patch)).affected
}
