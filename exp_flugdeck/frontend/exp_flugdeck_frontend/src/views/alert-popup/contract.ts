import { definePluginView } from 'fh2-plugin-sdk/view'
import type { PluginViewClient } from 'fh2-plugin-sdk/view'

export interface AlertPopupState {
  readonly title: string;
  readonly message: string;
}

interface AlertPopupContract {
  state: AlertPopupState;
  methods: { close: () => Promise<void> };
}
export const alertPopup = definePluginView<AlertPopupContract>('alert-popup')
export type AlertPopupClient = PluginViewClient<AlertPopupContract>
