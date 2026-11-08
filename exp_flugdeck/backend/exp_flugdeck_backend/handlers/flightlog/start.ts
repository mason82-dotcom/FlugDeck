import { startFlight } from '../../shared/flightlog'
import type { FlightInput } from '../../shared/flightlog'
import { nowMs } from '../../shared/time'
import type { HandlerCtx } from 'fh2-plugin-sdk/backend'

/** flightlog.start: Flug idempotent über flightKey anlegen. */
export function start (input: FlightInput, ctx: HandlerCtx) {
  return startFlight(input, nowMs(ctx.now))
}
