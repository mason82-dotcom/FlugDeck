import { finishFlight } from '../../shared/flightlog'
import type { FlightInput } from '../../shared/flightlog'
import { nowMs } from '../../shared/time'
import type { HandlerCtx } from 'fh2-plugin-sdk/backend'

/** flightlog.finish: aktiven Flug mit Kennwerten abschließen. */
export function finish (input: FlightInput, ctx: HandlerCtx) {
  return finishFlight(input, nowMs(ctx.now))
}
