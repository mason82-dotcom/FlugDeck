import { definePluginView } from 'fh2-plugin-sdk/view'
import type { PluginViewClient } from 'fh2-plugin-sdk/view'

export const NOTE_MAX_LENGTH = 200
/** Schlüssel in biz_ext; der Host erlaubt pro Aufgabe nur einen Plugin-Eigentümer. */
export const BIZ_EXT_KEY = 'flugdeck'

export interface PlanNoteState {
  readonly available: boolean;
  readonly note: string;
}

interface PlanNoteContract {
  state: PlanNoteState;
  methods: { setNote: (input: { note: string }) => void };
}
export const planNote = definePluginView<PlanNoteContract>('plan-note')
export type PlanNoteClient = PluginViewClient<PlanNoteContract>
