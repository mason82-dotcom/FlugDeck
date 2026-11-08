<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { CockpitPanelState, StatusClient } from './contract'
import { initialPanel } from './contract'
import { dash, duration, figure, position, stamp, time, unit } from '../shared/format'

// Aufbau nach Dashboard-Schema: Status → Kennzahlen → Details → Systemzeile.
const { client } = defineProps<{ client: StatusClient }>()
const state = ref<CockpitPanelState>(initialPanel)
const bridgeError = ref('')
const pending = ref(false)
const backendTitles = { idle: 'Ungeprüft', loading: 'Prüfung läuft', ready: 'Erreichbar', error: 'Nicht erreichbar' }
const flightTitles = { idle: 'Kein Flug aktiv', recording: 'Flug wird protokolliert', error: 'Flugbuch gestört' }
const subscription = client.state.subscribe(next => { state.value = next })
const t = computed(() => state.value.telemetry)
const flight = computed(() => state.value.flight)
const recording = computed(() => flight.value.flightKey !== null)
const control = computed(() => t.value === null || t.value.hasFlightControl === null ? dash : t.value.hasFlightControl ? 'Ja' : 'Nein')
const backendPhase = computed(() => bridgeError.value ? 'error' : state.value.backend.phase)
const busy = computed(() => pending.value || state.value.backend.phase === 'loading')

const tiles = computed(() => {
  const readout = t.value
  return [
    { label: 'Höhe', value: figure(readout?.heightM ?? null), unit: 'm', max: recording.value ? unit(flight.value.maxHeightM, 'm') : null },
    { label: 'Geschwindigkeit', value: figure(readout?.horizontalSpeedMs ?? null), unit: 'm/s', max: recording.value ? unit(flight.value.maxSpeedMs, 'm/s') : null },
    { label: 'Steigen/Sinken', value: figure(readout?.verticalSpeedMs ?? null), unit: 'm/s', max: null },
    { label: 'Zum Startpunkt', value: figure(readout?.homeDistanceM ?? null), unit: 'm', max: null },
  ]
})

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

    <div class="card status" :data-phase="flight.phase">
      <p class="label">Flugbuch</p>
      <p class="headline" role="status"><i class="dot" aria-hidden="true"></i>{{ flightTitles[flight.phase] }}</p>
      <p v-if="recording" class="meta">Seit {{ time(flight.startedAt) }}</p>
      <p v-else-if="flight.lastFinished" class="meta">
        Letzter Flug {{ stamp(flight.lastFinished.startedAt) }} · {{ duration(flight.lastFinished.startedAt, flight.lastFinished.finishedAt) }}
      </p>
      <p class="error" v-if="flight.message" role="alert">{{ flight.message }}</p>
    </div>

    <h3 class="section">Telemetrie</h3>
    <p v-if="!t" class="hint empty">Der Host stellt keine Telemetrie bereit.</p>
    <template v-else>
      <ul class="tiles" aria-label="Aktuelle Flugwerte">
        <li v-for="tile in tiles" :key="tile.label" class="card tile">
          <span class="label">{{ tile.label }}</span>
          <span class="figure">{{ tile.value }} <span class="unit">{{ tile.unit }}</span></span>
          <span v-if="tile.max" class="max">max. {{ tile.max }}</span>
        </li>
      </ul>
      <dl>
        <div><dt>Position</dt><dd>{{ position(t.latitude, t.longitude) }}</dd></div>
        <div><dt>Flugsteuerung bei mir</dt><dd>{{ control }}</dd></div>
      </dl>
    </template>

    <footer :data-phase="backendPhase">
      <div class="system">
        <p role="status"><i class="dot" aria-hidden="true"></i>Plugin-Backend: {{ bridgeError ? 'Panelverbindung gestört' : backendTitles[state.backend.phase] }}</p>
        <p v-if="!bridgeError && state.backend.checkedAt !== null" class="meta">
          {{ state.backend.phase === 'ready' ? 'Version ' + state.backend.detail + ' · ' : '' }}{{ time(state.backend.checkedAt) }} · {{ state.backend.durationMs }} ms
        </p>
      </div>
      <p class="error" v-if="bridgeError || state.backend.phase === 'error'">
        {{ bridgeError || state.backend.detail }} Bitte Netzwerk prüfen und die Verbindung erneut prüfen.
      </p>
      <button type="button" class="secondary" :aria-busy="busy" :disabled="busy && !bridgeError" @click="check">
        {{ busy ? 'Prüfung läuft …' : 'Verbindung prüfen' }}
      </button>
    </footer>
  </section>
</template>
<style src="../shared/theme.css"></style>
<style scoped>
header { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
.mark { color: var(--fd-ok); font-size: 16px; }
.status { padding: 12px 16px; }
.headline { margin-top: 4px; font-size: 16px; font-weight: 600; line-height: 1.25; overflow-wrap: anywhere; }
.meta { margin-top: 4px; font-size: 12px; line-height: 1.4; color: var(--fd-muted); font-variant-numeric: tabular-nums; }
.status .error { margin-top: 8px; }
.section { margin: 24px 0 8px; }
.empty { margin-bottom: 16px; }
.tiles { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin: 0; padding: 0; list-style: none; }
.tile { display: flex; flex-direction: column; gap: 4px; padding: 12px; min-width: 0; }
.figure { font-size: 24px; font-weight: 600; line-height: 1.25; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.unit { font-size: 12px; font-weight: 500; color: var(--fd-muted); }
.max { font-size: 12px; line-height: 1.4; color: var(--fd-ok); font-variant-numeric: tabular-nums; }
dl { margin-top: 8px; }
dl div:last-child { border-bottom: 0; }
footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--fd-line); }
.system p[role="status"] { font-weight: 500; }
footer .error { margin-top: 8px; }
button { width: 100%; margin-top: 12px; }
</style>
