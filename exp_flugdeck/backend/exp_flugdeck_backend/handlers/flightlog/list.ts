import { listFlights } from '../../shared/flightlog'
import type { FlightInput } from '../../shared/flightlog'
import type { HandlerCtx } from 'fh2-plugin-sdk/backend'

/** flightlog.list: Flüge eines Projekts, neueste zuerst. */
export function list (input: FlightInput, _ctx: HandlerCtx) {
  return listFlights(input)
}
