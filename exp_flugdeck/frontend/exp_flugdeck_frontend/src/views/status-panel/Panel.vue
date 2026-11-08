<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import type { StatusClient, StatusState } from './contract'
import { initialStatus } from './contract'

const { client } = defineProps<{ client: StatusClient }>()
const state = ref<StatusState>(initialStatus)
const bridgeError = ref('')
const pending = ref(false)
const titles = { idle: 'Ungeprüft', loading: 'Prüfung läuft', ready: 'Erreichbar', error: 'Prüfung fehlgeschlagen' }
const clock = new Intl.DateTimeFormat('de-DE', { timeStyle: 'medium' })
const subscription = client.state.subscribe(next => { state.value = next })
async function check () {
  if (pending.value) return
  pending.value = true
  bridgeError.value = ''
  try { await client.refresh() }
  catch { bridgeError.value = 'Das Panel konnte den Plugin-Einstieg nicht erreichen.' }
  finally { pending.value = false }
}
onMounted(check)
onUnmounted(() => subscription.dispose())
</script>
<template>
  <section lang="de" aria-label="Flugdeck">
    <header><span class="mark" aria-hidden="true">◭</span><h2>Flugdeck</h2></header>
    <div class="readout" :data-phase="bridgeError ? 'error' : state.phase">
      <h3>Plugin-Backend</h3>
      <p role="status"><i aria-hidden="true"></i>{{ bridgeError ? 'Panelverbindung gestört' : titles[state.phase] }}</p>
    </div>
    <p class="error" v-if="bridgeError || state.phase === 'error'">{{ bridgeError || state.detail }}</p>
    <dl v-if="!bridgeError">
      <div><dt>Backend-Version</dt><dd>{{ state.phase === 'ready' ? state.detail : '—' }}</dd></div>
      <div><dt>Geprüft um</dt><dd>{{ state.checkedAt === null ? '—' : clock.format(state.checkedAt) }}</dd></div>
      <div><dt>Anfragedauer</dt><dd>{{ state.durationMs === null ? '—' : state.durationMs + ' ms' }}</dd></div>
    </dl>
    <button type="button" :disabled="pending || (!bridgeError && state.phase === 'loading')" @click="check">
      {{ pending ? 'Prüfung läuft …' : 'Verbindung prüfen' }}
    </button>
  </section>
</template>
<style scoped>
section { box-sizing: border-box; min-width: 0; padding: 16px; background: #182128; color: #edf3f5; font: 14px/1.45 system-ui, sans-serif; }
header { display: flex; align-items: center; gap: 8px; margin-bottom: 18px; }
.mark { color: #94dbcb; font-size: 20px; }
h2, h3, p, dl, dd { margin: 0; }
h2 { font-size: 18px; font-weight: 650; }
h3, dt { font-size: 13px; font-weight: 500; color: #bdcbd2; }
.readout { border-inline-start: 3px solid var(--signal); padding-inline-start: 10px; --signal: #a8b6bd; }
.readout[data-phase="ready"] { --signal: #94dbcb; }
.readout[data-phase="error"] { --signal: #ffae95; }
.readout[data-phase="loading"] { --signal: #f2cf8b; }
.readout p { font-size: 21px; font-weight: 620; overflow-wrap: anywhere; }
i { display: inline-block; width: 7px; height: 7px; margin: 0 8px 3px 0; border-radius: 50%; background: var(--signal); }
dl { margin-block: 14px; }
dl div { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 2px 8px; padding: 6px 0; border-bottom: 1px solid #35444e; }
dd { font-variant-numeric: tabular-nums; overflow-wrap: anywhere; min-width: 0; }
.error { color: #ffbea8; margin-block: 12px; overflow-wrap: anywhere; }
button { width: 100%; min-height: 44px; padding: 6px 10px; color: #112328; background: #94dbcb; border: 0; border-radius: 4px; font: inherit; font-weight: 600; cursor: pointer; }
button:disabled { background: #abbac0; cursor: wait; }
button:focus-visible { outline: 2px solid white; outline-offset: 2px; }
</style>
