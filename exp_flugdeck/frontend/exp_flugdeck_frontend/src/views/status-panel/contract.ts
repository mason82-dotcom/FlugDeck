import { definePluginView } from 'fh2-plugin-sdk/view'
import type { PluginViewClient } from 'fh2-plugin-sdk/view'
import { initialFlight } from '../../domain/flight-tracker'
import type { FlightTrackerState } from '../../domain/flight-tracker'
import type { TelemetryReadout } from '../../domain/telemetry'

export interface BackendStatus {
  readonly phase: 'idle' | 'loading' | 'ready' | 'error';
  readonly detail: string;
  readonly checkedAt: number | null;
  readonly durationMs: number | null;
}

export const initialBackend: BackendStatus = { phase: 'idle', detail: '', checkedAt: null, durationMs: null }

export interface CockpitPanelState {
  readonly backend: BackendStatus;
  /** null: Telemetrie-Capability fehlt im Host oder ist nicht freigegeben. */
  readonly telemetry: TelemetryReadout | null;
  readonly flight: FlightTrackerState;
}

export const initialPanel: CockpitPanelState = { backend: initialBackend, telemetry: null, flight: initialFlight }

interface StatusContract {
  state: CockpitPanelState;
  methods: { refresh: () => Promise<void> };
}
export const statusPanel = definePluginView<StatusContract>('status-panel')
export type StatusClient = PluginViewClient<StatusContract>
