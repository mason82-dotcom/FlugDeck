<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import type { PlanNoteClient, PlanNoteState } from './contract'
import { NOTE_MAX_LENGTH } from './contract'

const { client } = defineProps<{ client: PlanNoteClient }>()
const state = ref<PlanNoteState>({ available: false, note: '' })
const subscription = client.state.subscribe(next => { state.value = next })
function input (event: Event) {
  void client.setNote({ note: (event.target as HTMLTextAreaElement).value })
}
onUnmounted(() => subscription.dispose())
</script>
<template>
  <section class="fd" lang="de">
    <label for="flugdeck-note"><h3>Flugbuch-Notiz</h3></label>
    <textarea id="flugdeck-note" rows="2" :maxlength="NOTE_MAX_LENGTH" :value="state.note" :disabled="!state.available"
      aria-describedby="flugdeck-note-hint" @input="input"></textarea>
    <p id="flugdeck-note-hint" class="hint">Optional. Wird mit der Aufgabe gespeichert und im Flugbuch zugeordnet. {{ state.note.length }}/{{ NOTE_MAX_LENGTH }}</p>
  </section>
</template>
<style src="../shared/theme.css"></style>
<style scoped>
textarea { box-sizing: border-box; width: 100%; margin-top: 6px; padding: 8px; font: inherit; color: var(--fd-text); background: #0f161b; border: 1px solid var(--fd-line); border-radius: 4px; resize: vertical; }
.hint { margin-top: 4px; font-size: 12px; color: var(--fd-muted); }
</style>
