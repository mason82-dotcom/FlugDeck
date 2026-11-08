import { definePluginView } from 'fh2-plugin-sdk/view'
import type { PluginViewClient } from 'fh2-plugin-sdk/view'

export interface StatusState {
  phase: 'idle' | 'loading' | 'ready' | 'error';
  detail: string;
  checkedAt: number | null;
  durationMs: number | null;
}
export const initialStatus: StatusState = {
  phase: 'idle', detail: '', checkedAt: null, durationMs: null,
}
interface StatusContract {
  state: StatusState;
  methods: { refresh: () => Promise<void>; refreshLive: () => Promise<string> };
}
export const statusPanel = definePluginView<StatusContract>('status-panel')
export type StatusClient = PluginViewClient<StatusContract>
