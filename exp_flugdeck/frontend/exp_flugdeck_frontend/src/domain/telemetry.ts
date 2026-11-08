import type { TelemetryState } from 'fh2-plugin-sdk'

/** Für das Panel aufbereitete Telemetrie; null heißt: Host liefert den Wert nicht. */
export interface TelemetryReadout {
  readonly heightM: number | null
  readonly horizontalSpeedMs: number | null
  readonly verticalSpeedMs: number | null
  readonly homeDistanceM: number | null
  readonly latitude: number | null
  readonly longitude: number | null
  readonly hasFlightControl: boolean | null
}

export const emptyReadout: TelemetryReadout = {
  heightM: null, horizontalSpeedMs: null, verticalSpeedMs: null, homeDistanceM: null,
  latitude: null, longitude: null, hasFlightControl: null,
}

function finite (value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function toReadout (state: TelemetryState | null | undefined): TelemetryReadout {
  const pose = state?.drone?.pose ?? null
  return {
    heightM: finite(pose?.height),
    horizontalSpeedMs: finite(pose?.horizontal_speed),
    verticalSpeedMs: finite(pose?.vertical_speed),
    homeDistanceM: finite(pose?.home_distance),
    latitude: finite(pose?.latitude),
    longitude: finite(pose?.longitude),
    hasFlightControl: typeof state?.control?.flight?.hasControl === 'boolean' ? state.control.flight.hasControl : null,
  }
}
