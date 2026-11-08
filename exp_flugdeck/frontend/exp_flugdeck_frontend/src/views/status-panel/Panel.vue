<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { StatusClient, StatusState } from './contract'
import { initialStatus } from './contract'
import { aircraft, assessDock4, controllers, inspectPair } from './device-check'
import type { AircraftId, ControllerId, DeviceId } from './device-check'

const { client } = defineProps<{ client: StatusClient }>()
const state = ref<StatusState>(initialStatus)
const bridgeError = ref('')
const pending = ref(false)
const tab = ref<'status' | 'devices'>('status')
const deviceTab = ref<'inventory' | 'dock4'>('inventory')
const controller = ref<ControllerId | ''>('')
const selectedAircraft = ref<AircraftId | ''>('')
const pairing = computed(() => inspectPair(controller.value, selectedAircraft.value))
const mode = ref<'unknown' | 'external' | 'other'>('unknown')
const versions = ref<Record<DeviceId, string>>({ o4: '', dock4: '', m5td: '' })
const assessment = computed(() => assessDock4(mode.value, versions.value))
const firmwareLabels = { missing: 'Nicht angegeben', invalid: 'Format prüfen', below: 'Unter Mindestversion', meets: 'Mindestversion erreicht' }
const assessmentLabels = { unknown: 'Angaben fehlen', blocked: 'Voraussetzung nicht erfüllt', compatible: 'Versionsprüfung bestanden' }
const pairingLabels = { unknown: 'Kombination auswählen', compatible: 'Modellkombination laut DJI kompatibel', incompatible: 'Modellkombination laut DJI nicht kompatibel' }
const display = computed<StatusState>(() => {
  if (pending.value) return { ...initialStatus, phase: 'loading' }
  if (bridgeError.value) return { ...initialStatus, phase: 'error', detail: bridgeError.value }
  return state.value
})
const titles = { idle: 'Ungeprüft', loading: 'Prüfung läuft', ready: 'Erreichbar', error: 'Prüfung fehlgeschlagen' }
const clock = new Intl.DateTimeFormat('de-DE', { timeStyle: 'medium' })
const subscription = client.state.subscribe(next => { state.value = next })
async function check () {
  if (pending.value) return
  pending.value = true
  bridgeError.value = ''
  try { await client.refresh() }
  catch { bridgeError.value = 'Das Cockpit konnte die Prüfung nicht abschließen. Bitte erneut prüfen.' }
  finally { pending.value = false }
}
onMounted(check)
onUnmounted(() => subscription.dispose())
</script>
<template>
  <section lang="de" aria-label="Flugdeck">
    <header><span class="mark" aria-hidden="true">◭</span><h2>Flugdeck</h2></header>
    <nav class="tabs" aria-label="Flugdeck-Bereiche">
      <button type="button" :aria-current="tab === 'status' ? 'page' : undefined" @click="tab = 'status'">Verbindung</button>
      <button type="button" :aria-current="tab === 'devices' ? 'page' : undefined" @click="tab = 'devices'">Gerätecheck</button>
    </nav>
    <div v-if="tab === 'status'">
    <div class="readout" :data-phase="display.phase">
      <h3>Plugin-Backend</h3>
      <p role="status"><i aria-hidden="true"></i>{{ bridgeError ? 'Panelverbindung gestört' : titles[display.phase] }}</p>
    </div>
    <p class="error" v-if="display.phase === 'error'">{{ display.detail }}</p>
    <dl>
      <div><dt>Backend-Version</dt><dd>{{ display.phase === 'ready' ? display.detail : '—' }}</dd></div>
      <div><dt>Geprüft um</dt><dd>{{ display.checkedAt === null ? '—' : clock.format(display.checkedAt) }}</dd></div>
      <div><dt>Anfragedauer</dt><dd>{{ display.durationMs === null ? '—' : display.durationMs + ' ms' }}</dd></div>
    </dl>
    <button type="button" :disabled="display.phase === 'loading'" @click="check">
      {{ display.phase === 'loading' ? 'Prüfung läuft …' : display.phase === 'error' ? 'Erneut prüfen' : 'Verbindung prüfen' }}
    </button>
    </div>
    <div v-else class="devices">
      <nav class="tabs subtabs" aria-label="Gerätefunktionen">
        <button type="button" :aria-current="deviceTab === 'inventory' ? 'page' : undefined" @click="deviceTab = 'inventory'">Ihre Geräte</button>
        <button type="button" :aria-current="deviceTab === 'dock4' ? 'page' : undefined" @click="deviceTab = 'dock4'">Dock 4 Referenz</button>
      </nav>
      <div v-if="deviceTab === 'inventory'">
        <p class="intro">Controller & Fluggerät</p>
        <p class="hint">Wählen Sie eine Kombination. Die Zuordnung und Module sind eine Geräteübersicht, keine Erkennung einer aktiven Verbindung.</p>
        <label class="mode">Fernsteuerung
          <select v-model="controller"><option value="">Bitte auswählen</option><option v-for="item in controllers" :key="item.id" :value="item.id">{{ item.name }}</option></select>
        </label>
        <label class="mode">Fluggerät
          <select v-model="selectedAircraft"><option value="">Bitte auswählen</option><option v-for="item in aircraft" :key="item.id" :value="item.id">{{ item.name }}</option></select>
        </label>
        <p class="assessment" :data-result="pairing.status" role="status">{{ pairingLabels[pairing.status] }}</p>
        <div v-if="pairing.model" class="modules">
          <h3>Relevante Module</h3>
          <ul><li v-for="module in pairing.model.modules" :key="module">{{ module }}</li></ul>
          <p class="hint">Modellprofil zur Planung. Datenzugriff, Sensorfunktionen und Cloud-Unterstützung werden erst nach einer echten Geräteanbindung geprüft.</p>
        </div>
        <p class="hint">Status: keine Live-Telemetrie · kein Gerätebefehl · kein Flugfreigabenachweis.</p>
      </div>
      <div v-else>
      <p class="intro">Dock 4 · Cloud API v1.20</p>
      <p class="hint">Versionen manuell eingeben. Diese Prüfung liest keine Gerätedaten aus und gibt keinen Flug frei.</p>
      <label class="mode">O4-Betriebsmodus
        <select v-model="mode">
          <option value="unknown">Unbekannt</option>
          <option value="external">Externer Dock-Modus (basestation_work_mode = 1)</option>
          <option value="other">Anderer Modus</option>
        </select>
      </label>
      <ol class="device-list" aria-label="Gerätetopologie">
        <li v-for="device in assessment.devices" :key="device.id">
          <div class="device-heading"><strong>{{ device.name }}</strong><span>{{ device.role }}</span></div>
          <label :for="`firmware-${device.id}`">Firmware · mindestens {{ device.minimum }}</label>
          <input :id="`firmware-${device.id}`" v-model.trim="versions[device.id]" type="text" inputmode="numeric" :placeholder="device.minimum" autocomplete="off" spellcheck="false" />
          <small :data-result="device.result">{{ firmwareLabels[device.result] }}</small>
        </li>
      </ol>
      <p class="assessment" :data-result="assessment.status" role="status">{{ assessmentLabels[assessment.status] }}</p>
      <p class="hint">O4 ist das Gateway; Dock 4 und Matrice 5TD sind Untergeräte. Ein Relay kann Teil der Topologie sein. Die Modusumschaltung erfolgt am Gerät oder in DJI-Anwendungen.</p>
      </div>
    </div>
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
.tabs { display: flex; gap: 4px; margin-bottom: 18px; border-bottom: 1px solid #35444e; }
.tabs button { width: auto; flex: 1; color: #bdcbd2; background: transparent; border-radius: 0; border-bottom: 2px solid transparent; }
.tabs button[aria-current="page"] { color: #edf3f5; border-color: #94dbcb; }
.devices .intro { font-size: 16px; font-weight: 650; margin-bottom: 7px; }
.hint { color: #bdcbd2; font-size: 12px; line-height: 1.5; margin-bottom: 16px; }
.mode, .device-list label { display: block; color: #bdcbd2; font-size: 12px; }
select, input { box-sizing: border-box; width: 100%; min-height: 42px; margin-top: 6px; padding: 8px; color: #edf3f5; background: #24323b; border: 1px solid #52636d; border-radius: 4px; font: inherit; }
select:focus-visible, input:focus-visible { outline: 2px solid #94dbcb; outline-offset: 2px; }
.device-list { list-style: none; margin: 16px 0; padding: 0; }
.device-list li { padding: 12px 0; border-top: 1px solid #35444e; }
.device-heading { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 2px 8px; margin-bottom: 8px; }
.device-heading span { color: #bdcbd2; font-size: 12px; }
.device-list small { display: block; padding-top: 5px; color: #bdcbd2; }
.device-list small[data-result="below"], .device-list small[data-result="invalid"], .assessment[data-result="blocked"] { color: #ffbea8; }
.device-list small[data-result="meets"], .assessment[data-result="compatible"] { color: #94dbcb; }
.assessment { padding: 10px; background: #24323b; border-inline-start: 3px solid currentColor; font-weight: 650; margin-bottom: 14px; }
.assessment[data-result="incompatible"] { color: #ffbea8; }
.subtabs { margin-top: -6px; }
.mode + .mode { margin-top: 12px; }
.mode select { margin-bottom: 10px; }
.modules { padding: 12px; margin-bottom: 12px; border: 1px solid #35444e; border-radius: 4px; }
.modules ul { padding-left: 18px; margin: 8px 0 12px; }
.modules li { margin: 4px 0; }
</style>
