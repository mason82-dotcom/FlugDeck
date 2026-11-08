import type { HandlerCtx } from 'fh2-plugin-sdk/backend'

/** flugdeck.status: Erreichbarkeit und Version des Backends. */
export function status (_input: Readonly<Record<string, unknown>>, ctx: HandlerCtx) {
  return { service: 'flugdeck', version: ctx.pluginVersion || '0.3.0' }
}
