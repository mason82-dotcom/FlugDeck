import { definePluginView } from 'fh2-plugin-sdk/view'
import type { PluginViewClient } from 'fh2-plugin-sdk/view'
import type { FlightEntry } from '../../api/flugdeck-api'

export interface FlightlogState {
  readonly phase: 'idle' | 'loading' | 'ready' | 'error';
  readonly projectId: string | null;
  readonly items: readonly FlightEntry[];
  readonly total: number;
  readonly message: string;
}

export const initialFlightlog: FlightlogState = { phase: 'idle', projectId: null, items: [], total: 0, message: '' }

interface FlightlogContract {
  state: FlightlogState;
  methods: { reload: () => Promise<void> };
}
export const flightlogPage = definePluginView<FlightlogContract>('flightlog-page')
export type FlightlogClient = PluginViewClient<FlightlogContract>
