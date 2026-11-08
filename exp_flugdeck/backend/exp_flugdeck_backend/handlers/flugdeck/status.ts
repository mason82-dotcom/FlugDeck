import type { HandlerCtx } from 'fh2-plugin-sdk/backend'

export function status (_input: Readonly<Record<string, unknown>>, _ctx: HandlerCtx) {
  return { service: 'flugdeck', version: '0.5.0' }
}
