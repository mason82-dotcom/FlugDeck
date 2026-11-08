<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { CockpitPanelState, StatusClient } from './contract'
import { initialPanel } from './contract'
import { dash, duration, position, stamp, time, unit } from '../shared/format'

const { client } = defineProps<{ client: StatusClient }>()
const state = ref<CockpitPanelState>(initialPanel)
const bridgeError = ref('')
const pending = ref(false)
const backendTitles = { idle: 'Ungeprüft', loading: 'Prüfung läuft', ready: 'Erreichbar', error: 'Nicht erreichbar' }
const flightTitles = { idle: 'Kein Flug aktiv', recording: 'Flug wird protokolliert', error: 'Flugbuch gestört' }
const subscription = client.state.subscribe(next => { state.value = next })
const t = computed(() => state.value.telemetry)
const flight = computed(() => state.value.flight)
const control = computed(() => t.value?.hasFlightControl === null || t.value === null ? dash : t.value.hasFlightControl ? 'Ja' : 'Nein')

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
  <section class="fd" lang="de" aria-label="Flugdeck">
    <header><span class="mark" aria-hidden="true">◭</span><h2>Flugdeck</h2></header>

    <div class="readout" :data-phase="flight.phase">
      <h3>Flugbuch</h3>
      <p class="headline" role="status"><i class="dot" aria-hidden="true"></i>{{ flightTitles[flight.phase] }}</p>
    </div>
    <p class="error" v-if="flight.message">{{ flight.message }}</p>
    <dl>
      <div><dt>Start</dt><dd>{{ time(flight.startedAt) }}</dd></div>
      <div><dt>Max. Höhe</dt><dd>{{ unit(flight.maxHeightM, 'm') }}</dd></div>
      <div><dt>Max. Geschwindigkeit</dt><dd>{{ unit(flight.maxSpeedMs, 'm/s') }}</dd></div>
      <div v-if="flight.lastFinished">
        <dt>Letzter Flug</dt>
        <dd>{{ stamp(flight.lastFinished.startedAt) }} · {{ duration(flight.lastFinished.startedAt, flight.lastFinished.finishedAt) }}</dd>
      </div>
    </dl>

    <h3 class="section">Telemetrie</h3>
    <p v-if="!t" class="hint">Der Host stellt keine Telemetrie bereit.</p>
    <dl v-else>
      <div><dt>Höhe</dt><dd>{{ unit(t.heightM, 'm') }}</dd></div>
      <div><dt>Geschwindigkeit horizontal</dt><dd>{{ unit(t.horizontalSpeedMs, 'm/s') }}</dd></div>
      <div><dt>Geschwindigkeit vertikal</dt><dd>{{ unit(t.verticalSpeedMs, 'm/s') }}</dd></div>
      <div><dt>Entfernung zum Startpunkt</dt><dd>{{ unit(t.homeDistanceM, 'm') }}</dd></div>
      <div><dt>Position</dt><dd>{{ position(t.latitude, t.longitude) }}</dd></div>
      <div><dt>Flugsteuerung bei mir</dt><dd>{{ control }}</dd></div>
    </dl>

    <div class="readout backend" :data-phase="bridgeError ? 'error' : state.backend.phase">
      <h3>Plugin-Backend</h3>
      <p><i class="dot" aria-hidden="true"></i>{{ bridgeError ? 'Panelverbindung gestört' : backendTitles[state.backend.phase] }}</p>
    </div>
    <p class="error" v-if="bridgeError || state.backend.phase === 'error'">{{ bridgeError || state.backend.detail }}</p>
    <dl v-if="!bridgeError">
      <div><dt>Backend-Version</dt><dd>{{ state.backend.phase === 'ready' ? state.backend.detail : dash }}</dd></div>
      <div><dt>Geprüft um</dt><dd>{{ time(state.backend.checkedAt) }}</dd></div>
      <div><dt>Anfragedauer</dt><dd>{{ state.backend.durationMs === null ? dash : state.backend.durationMs + ' ms' }}</dd></div>
    </dl>
    <button type="button" :disabled="pending || (!bridgeError && state.backend.phase === 'loading')" @click="check">
      {{ pending ? 'Prüfung läuft …' : 'Verbindung prüfen' }}
    </button>
  </section>
</template>
<style src="../shared/theme.css"></style>
<style scoped>
header { display: flex; align-items: center; gap: 8px; margin-bottom: 18px; }
.mark { color: var(--fd-ok); font-size: 20px; }
.headline { font-size: 21px; font-weight: 620; overflow-wrap: anywhere; }
.section { margin-top: 18px; }
.hint { color: var(--fd-muted); margin-block: 8px 14px; }
.error { margin-block: 12px; }
dl { margin-block: 10px 18px; }
.backend p { font-size: 15px; font-weight: 600; }
button { width: 100%; }
</style>
