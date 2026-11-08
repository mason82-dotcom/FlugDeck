import { createViewState } from 'fh2-plugin-sdk'
import type { AppMessageContext } from '../../generated/plugin-types'
import { alertPopup } from '../../views/alert-popup/contract'
import type { AlertPopupState } from '../../views/alert-popup/contract'

/**
 * Message: Platzhalter für ein Flugdeck-Popup. Es bleibt unsichtbar; eine spätere Funktion
 * setzt Titel/Text über state.update und blendet es mit contribution.update({ visible: true }) ein
 * (z. B. Hinweis auf einen nicht abgeschlossenen Flug).
 */
export async function activate (ctx: AppMessageContext) {
  const state = createViewState<AlertPopupState>({ title: '', message: '' })
  await alertPopup.handle(ctx, {
    state,
    methods: { close: async () => { await contribution.update({ visible: false }) } },
  })
  const contribution = await ctx.extensions.contribute('alert-popup', {
    visible: false,
    render: () => alertPopup.get(ctx),
  })
}
