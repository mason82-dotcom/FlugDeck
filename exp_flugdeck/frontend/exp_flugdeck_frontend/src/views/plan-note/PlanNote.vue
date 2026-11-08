<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import type { PlanNoteClient, PlanNoteState } from './contract'
import { NOTE_MAX_LENGTH } from './contract'

const { client } = defineProps<{ client: PlanNoteClient }>()
const state = ref<PlanNoteState>({ available: false, note: '' })
const subscription = client.state.subscribe(next => { state.value = next })
const touched = ref(false)
// Fehler erst nach dem ersten Verlassen des Felds zeigen, beim Korrigieren sofort entfernen.
const tooLong = computed(() => touched.value && state.value.note.length > NOTE_MAX_LENGTH)
function input (event: Event) {
  void client.setNote({ note: (event.target as HTMLTextAreaElement).value })
}
onUnmounted(() => subscription.dispose())
</script>
<template>
  <section class="fd" lang="de">
    <label class="label" for="flugdeck-note">Flugbuch-Notiz</label>
    <textarea id="flugdeck-note" rows="2" :value="state.note" :disabled="!state.available"
      aria-describedby="flugdeck-note-hint" :aria-invalid="tooLong" @input="input" @blur="touched = true"></textarea>
    <p v-if="tooLong" id="flugdeck-note-hint" class="error">Kürze die Notiz auf {{ NOTE_MAX_LENGTH }} Zeichen, damit die Aufgabe gespeichert werden kann ({{ state.note.length }}/{{ NOTE_MAX_LENGTH }}).</p>
    <p v-else id="flugdeck-note-hint" class="hint">Optional. Wird mit der Aufgabe gespeichert. {{ state.note.length }}/{{ NOTE_MAX_LENGTH }}</p>
  </section>
</template>
<style src="../shared/theme.css"></style>
<style scoped>
textarea { display: block; margin-top: 4px; resize: vertical; }
textarea[aria-invalid="true"] { border-color: var(--fd-error); }
.hint, .error { margin-top: 4px; font-size: 12px; line-height: 1.4; }
</style>
