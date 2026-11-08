<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import type { FlightlogClient, FlightlogState } from './contract'
import { initialFlightlog } from './contract'
import { dash, duration, stamp, unit } from '../shared/format'

// Seitenmuster: List / Index (Kopf mit Aktion, Suche, gerahmte Liste, Leer- und Filterzustand).
const { client } = defineProps<{ client: FlightlogClient }>()
const state = ref<FlightlogState>(initialFlightlog)
const bridgeError = ref('')
const query = ref('')
const subscription = client.state.subscribe(next => { state.value = next })

const visible = computed(() => {
  const needle = query.value.trim().toLowerCase()
  if (!needle) return state.value.items
  return state.value.items.filter(item =>
    [item.droneSn, stamp(item.startedAt), item.mediaRef].some(text => text.toLowerCase().includes(needle)))
})
const loading = computed(() => state.value.phase === 'loading')

async function reload () {
  bridgeError.value = ''
  try { await client.reload() }
  catch { bridgeError.value = 'Das Flugbuch konnte den Plugin-Einstieg nicht erreichen. Bitte die Seite neu laden.' }
}
onUnmounted(() => subscription.dispose())
</script>
<template>
  <section class="fd" lang="de" aria-labelledby="flugdeck-log-title" :aria-busy="loading">
    <header>
      <h2 id="flugdeck-log-title">Flugbuch</h2>
      <button type="button" class="secondary" :disabled="loading || !state.projectId" :aria-busy="loading" @click="reload">
        {{ loading ? 'Lädt …' : 'Liste aktualisieren' }}
      </button>
    </header>

    <p class="error" v-if="bridgeError || state.phase === 'error'" role="alert">
      {{ bridgeError || state.message }}<template v-if="!bridgeError && state.projectId"> Mit „Liste aktualisieren“ erneut laden.</template>
    </p>

    <label class="label" for="flugdeck-log-search">Flüge durchsuchen</label>
    <input id="flugdeck-log-search" v-model="query" type="search" placeholder="08.11.2026" autocomplete="off" />

    <div class="frame">
      <div v-if="state.phase === 'ready' && state.items.length === 0" class="empty">
        <h3 class="empty-title">Noch keine Flüge</h3>
        <p class="hint">Flüge erscheinen hier automatisch, sobald im Cockpit mit geöffnetem Flugdeck-Panel geflogen wird.</p>
      </div>
      <div v-else-if="state.items.length > 0 && visible.length === 0" class="empty">
        <h3 class="empty-title">Keine Flüge passen zur Suche</h3>
        <p class="hint">Andere Drohne oder anderes Datum versuchen.</p>
        <button type="button" class="secondary" @click="query = ''">Suche zurücksetzen</button>
      </div>
      <p v-else-if="state.items.length === 0" class="empty hint">{{ loading ? 'Flüge werden geladen …' : dash }}</p>
      <ol v-else aria-label="Flüge, neueste zuerst">
        <li v-for="item in visible" :key="item.flightKey" :data-phase="item.status === 'active' ? 'recording' : 'ready'">
          <p class="title"><i class="dot" aria-hidden="true"></i>{{ stamp(item.startedAt) }}<span class="status">{{ item.status === 'active' ? 'läuft' : duration(item.startedAt, item.finishedAt) }}</span></p>
          <dl>
            <div><dt>Drohne</dt><dd>{{ item.droneSn || dash }}</dd></div>
            <div><dt>Max. Höhe</dt><dd>{{ unit(item.maxHeightM, 'm') }}</dd></div>
            <div><dt>Max. Geschwindigkeit</dt><dd>{{ unit(item.maxSpeedMs, 'm/s') }}</dd></div>
            <div><dt>Medien</dt><dd>{{ item.mediaRef || dash }}</dd></div>
          </dl>
        </li>
      </ol>
    </div>
    <p class="hint count" v-if="state.total > state.items.length">{{ state.items.length }} von {{ state.total }} Flügen geladen.</p>
  </section>
</template>
<style src="../shared/theme.css"></style>
<style scoped>
header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.error { margin-bottom: 16px; }
input { margin: 4px 0 16px; }
.frame { background: var(--fd-raised); border: 1px solid var(--fd-line); border-radius: 8px; }
ol { list-style: none; margin: 0; padding: 0; }
li { padding: 12px 16px; border-bottom: 1px solid var(--fd-line); }
li:last-child { border-bottom: 0; }
.title { display: flex; justify-content: space-between; gap: 8px; font-weight: 500; }
.status { color: var(--fd-muted); font-variant-numeric: tabular-nums; }
dl { margin-top: 4px; }
dl div:last-child { border-bottom: 0; }
.empty { padding: 16px; }
.empty-title { font-size: 14px; color: var(--fd-text); font-weight: 600; margin-bottom: 4px; }
.empty button { margin-top: 12px; }
.count { margin-top: 8px; font-size: 12px; }
</style>
