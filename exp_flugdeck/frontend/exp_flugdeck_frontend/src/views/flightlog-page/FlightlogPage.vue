<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import type { FlightlogClient, FlightlogState } from './contract'
import { initialFlightlog } from './contract'
import { dash, duration, stamp, unit } from '../shared/format'

const { client } = defineProps<{ client: FlightlogClient }>()
const state = ref<FlightlogState>(initialFlightlog)
const bridgeError = ref('')
const subscription = client.state.subscribe(next => { state.value = next })

async function reload () {
  bridgeError.value = ''
  try { await client.reload() }
  catch { bridgeError.value = 'Das Flugbuch konnte den Plugin-Einstieg nicht erreichen.' }
}
onUnmounted(() => subscription.dispose())
</script>
<template>
  <section class="fd" lang="de" aria-label="Flugbuch">
    <header>
      <h2>Flugbuch</h2>
      <button type="button" :disabled="state.phase === 'loading' || !state.projectId" @click="reload">
        {{ state.phase === 'loading' ? 'Lädt …' : 'Aktualisieren' }}
      </button>
    </header>
    <p class="error" v-if="bridgeError || state.phase === 'error'" role="alert">{{ bridgeError || state.message }}</p>
    <p class="hint" v-else-if="state.phase === 'ready' && state.items.length === 0">
      Noch keine Flüge in diesem Projekt. Flüge werden automatisch erfasst, wenn das Flugdeck-Panel im Cockpit geöffnet ist.
    </p>
    <ol v-if="state.items.length" aria-label="Flüge, neueste zuerst">
      <li v-for="item in state.items" :key="item.flightKey" :data-phase="item.status === 'active' ? 'recording' : 'ready'" class="readout">
        <p class="title"><i class="dot" aria-hidden="true"></i>{{ stamp(item.startedAt) }}</p>
        <dl>
          <div><dt>Dauer</dt><dd>{{ item.status === 'active' ? 'läuft' : duration(item.startedAt, item.finishedAt) }}</dd></div>
          <div><dt>Drohne</dt><dd>{{ item.droneSn || dash }}</dd></div>
          <div><dt>Max. Höhe</dt><dd>{{ unit(item.maxHeightM, 'm') }}</dd></div>
          <div><dt>Max. Geschwindigkeit</dt><dd>{{ unit(item.maxSpeedMs, 'm/s') }}</dd></div>
          <div><dt>Medien</dt><dd>{{ item.mediaRef || dash }}</dd></div>
        </dl>
      </li>
    </ol>
    <p class="hint" v-if="state.total > state.items.length">{{ state.items.length }} von {{ state.total }} Flügen angezeigt.</p>
  </section>
</template>
<style src="../shared/theme.css"></style>
<style scoped>
header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 16px; }
.title { font-weight: 600; margin-bottom: 4px; }
.hint { color: var(--fd-muted); }
.error { margin-block: 12px; }
</style>
