<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import type { StatusClient, StatusState } from './contract'

const { client } = defineProps<{ client: StatusClient }>()
const state = ref<StatusState>({ phase: 'idle', detail: '' })
const subscription = client.state.subscribe(next => { state.value = next })
onMounted(() => { void client.refresh() })
onUnmounted(() => subscription.dispose())
</script>
<template>
  <section lang="de">
    <h2>Flugdeck</h2>
    <p aria-live="polite">
      <template v-if="state.phase === 'ready'">Backend erreichbar · Version {{ state.detail }}</template>
      <template v-else-if="state.phase === 'error'">Prüfung fehlgeschlagen. {{ state.detail }}</template>
      <template v-else-if="state.phase === 'loading'">Backend wird geprüft …</template>
      <template v-else>Verbindung ungeprüft</template>
    </p>
    <button type="button" :disabled="state.phase === 'loading'" @click="client.refresh()">Verbindung prüfen</button>
  </section>
</template>
<style scoped>
section { padding: 18px; color: #e8edf2; background: #182128; font: 14px/1.5 system-ui, sans-serif; }
h2 { margin: 0; font-size: 18px; }
p { overflow-wrap: anywhere; }
button { padding: 8px 12px; color: #112328; background: #94dbcb; border: 0; border-radius: 4px; font: inherit; cursor: pointer; }
button:disabled { opacity: .65; }
button:focus-visible { outline: 2px solid white; outline-offset: 2px; }
</style>
