import { definePluginView } from 'fh2-plugin-sdk/view'
import type { PluginViewClient } from 'fh2-plugin-sdk/view'

export interface StatusState {
  phase: 'idle' | 'loading' | 'ready' | 'error';
  detail: string;
}
interface StatusContract {
  state: StatusState;
  methods: { refresh: () => Promise<void> };
}
export const statusPanel = definePluginView<StatusContract>('status-panel')
export type StatusClient = PluginViewClient<StatusContract>
