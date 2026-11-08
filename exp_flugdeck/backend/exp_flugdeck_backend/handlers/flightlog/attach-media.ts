import { attachMedia as attachMediaRef } from '../../shared/flightlog'
import type { FlightInput } from '../../shared/flightlog'
import type { HandlerCtx } from 'fh2-plugin-sdk/backend'

/** flightlog.attachMedia: Medienverweis an einen Flug hängen. */
export function attachMedia (input: FlightInput, _ctx: HandlerCtx) {
  return attachMediaRef(input)
}
