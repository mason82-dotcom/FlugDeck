import { createViewState } from 'fh2-plugin-sdk'
import type { PlanFormContextState, PluginValue } from 'fh2-plugin-sdk'
import { describeFailure } from '../../api/flugdeck-api'
import type { AppPlanContext } from '../../generated/plugin-types'
import { BIZ_EXT_KEY, NOTE_MAX_LENGTH, planNote } from '../../views/plan-note/contract'
import type { PlanNoteState } from '../../views/plan-note/contract'

function sourceNote (bizExt: Record<string, PluginValue> | undefined): string {
  const entry = bizExt?.[BIZ_EXT_KEY]
  if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) return ''
  const note = (entry as Record<string, PluginValue>).note
  return typeof note === 'string' ? note : ''
}

/**
 * Plan: Feld „Flugbuch-Notiz“ im Aufgabenformular. Eine nicht leere Notiz wird als
 * biz_ext.flugdeck.note mit der Aufgabe gespeichert; leer bleibt die Aufgabe unverändert.
 */
export async function activate (ctx: AppPlanContext) {
  const state = createViewState<PlanNoteState>({ available: false, note: '' })
  let formInstanceId: string | undefined
  let subscription: { dispose (): void } | undefined

  function apply (next: PlanFormContextState) {
    if (!next.available) {
      state.update(current => ({ ...current, available: false }))
      return
    }
    const isNewForm = next.formInstanceId !== formInstanceId
    formInstanceId = next.formInstanceId
    state.update(current => ({ available: true, note: isNewForm ? sourceNote(next.sourceBizExt) : current.note }))
  }

  await planNote.handle(ctx, {
    state,
    methods: { setNote: ({ note }) => state.update(current => ({ ...current, note: String(note).slice(0, NOTE_MAX_LENGTH) })) },
  })
  await ctx.extensions.contribute('plan-note', {
    render: () => planNote.get(ctx),
    validate: async () => state.get().note.trim().length <= NOTE_MAX_LENGTH
      ? { valid: true }
      : { valid: false, message: 'Die Flugbuch-Notiz darf höchstens ' + NOTE_MAX_LENGTH + ' Zeichen haben.' },
    onSubmit: async () => {
      const note = state.get().note.trim()
      return note ? { biz_ext: { [BIZ_EXT_KEY]: { note } } } : {}
    },
  })

  try {
    const form = await ctx.capabilities.get('plan:form-context')
    if (form) {
      apply(await form.getState())
      subscription = await form.onStateChanged(apply)
    } else {
      ctx.logger.warn('plan:form-context ist im Host nicht verfügbar')
    }
  } catch (error) {
    ctx.logger.error('Formularkontext konnte nicht gelesen werden', { errorMessage: describeFailure(error) })
  }

  return { dispose: async () => { subscription?.dispose() } }
}
