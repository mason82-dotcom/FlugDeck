<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { StatusClient, StatusState } from './contract'
import { initialStatus } from './contract'
import { aircraft, assessDock4, controllers, inspectPair } from './device-check'
import type { AircraftId, ControllerId, DeviceId } from './device-check'
import { advanceSimulation, initialSimulation, simulationReadout } from './dock4-simulator'
import type { SimAction } from './dock4-simulator'
import { fixtureSnapshot, observeSnapshot, parseDeviceSnapshot, parseLiveSnapshot } from './device-observation'
import type { DeviceSnapshot } from './device-observation'

const { client } = defineProps<{ client: StatusClient }>()
const state = ref<StatusState>(initialStatus)
const bridgeError = ref('')
const pending = ref(false)
const tab = ref<'status' | 'devices'>('status')
const deviceTab = ref<'inventory' | 'observations' | 'dock4' | 'simulation'>('inventory')
const snapshot = ref<DeviceSnapshot | null>(null)
const importText = ref('')
const importError = ref('')
const livePending = ref(false)
const liveNotice = ref('')
const observedAt = ref(Date.now())
const observedDevices = computed(() => snapshot.value ? observeSnapshot(snapshot.value, observedAt.value) : [])
function loadExample () { snapshot.value = fixtureSnapshot(Date.now()); observedAt.value = Date.now(); importError.value = ''; liveNotice.value = '' }
async function refreshLive () {
  if (livePending.value) return
  snapshot.value = null
  importError.value = ''
  liveNotice.value = ''
  liveNotice.value = ''
  livePending.value = true
  try {
    const result = parseLiveSnapshot(JSON.parse(await client.refreshLive()), Date.now())
    if (result === 'unconfigured') liveNotice.value = 'Noch kein Live-Snapshot vorhanden. Verbindung und Workflow prüfen.'
    else if (result === 'stale') liveNotice.value = 'Der letzte Live-Snapshot ist veraltet. Keine Gerätewerte werden angezeigt.'
    else { snapshot.value = result; observedAt.value = Date.now() }
  } catch { liveNotice.value = 'Live-Abruf fehlgeschlagen. Keine Gerätewerte werden angezeigt.' }
  finally { livePending.value = false }
}
function importSnapshot () {
  snapshot.value = null
  importError.value = ''
  try { snapshot.value = parseDeviceSnapshot(importText.value); observedAt.value = Date.now(); importText.value = '' }
  catch (error) { importText.value = ''; importError.value = error instanceof Error ? error.message : 'Import fehlgeschlagen.' }
}
let clockTimer: ReturnType<typeof setInterval> | undefined
const simulation = ref(initialSimulation)
const simReadout = computed(() => simulationReadout(simulation.value))
function simulate (action: SimAction) { simulation.value = advanceSimulation(simulation.value, action) }
const controller = ref<ControllerId | ''>('')
const selectedAircraft = ref<AircraftId | ''>('')
const pairing = computed(() => inspectPair(controller.value, selectedAircraft.value))
const mode = ref<'unknown' | 'external' | 'other'>('unknown')
const versions = ref<Record<DeviceId, string>>({ o4: '', dock4: '', m5td: '' })
const assessment = computed(() => assessDock4(mode.value, versions.value))
const firmwareLabels = { missing: 'Nicht angegeben', invalid: 'Format prüfen', below: 'Unter Mindestversion', meets: 'Mindestversion erreicht' }
const assessmentLabels = { unknown: 'Angaben fehlen', blocked: 'Voraussetzung nicht erfüllt', compatible: 'Versionsprüfung bestanden' }
const pairingLabels = { unknown: 'Kombination auswählen', compatible: 'Modellkombination laut DJI kompatibel', incompatible: 'Modellkombination laut DJI nicht kompatibel' }
const pairingText = computed(() => pairing.value.model?.fh2Support === 'unsupported'
  ? 'Hardwareprofil vorhanden · FlightHub 2 derzeit nicht unterstützt'
  : pairingLabels[pairing.value.status])
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
onMounted(() => { void check(); clockTimer = setInterval(() => { observedAt.value = Date.now() }, 1000) })
onUnmounted(() => { subscription.dispose(); if (clockTimer) clearInterval(clockTimer) })
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
        <button type="button" :aria-current="deviceTab === 'observations' ? 'page' : undefined" @click="deviceTab = 'observations'">Gerätedaten</button>
        <button type="button" :aria-current="deviceTab === 'dock4' ? 'page' : undefined" @click="deviceTab = 'dock4'">Dock 4 Referenz</button>
        <button type="button" :aria-current="deviceTab === 'simulation' ? 'page' : undefined" @click="deviceTab = 'simulation'">Simulation</button>
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
        <p class="assessment" :data-result="pairing.model?.fh2Support === 'unsupported' ? 'blocked' : pairing.status" role="status">{{ pairingText }}</p>
        <div v-if="pairing.model" class="modules">
          <h3>Relevante Module</h3>
          <p v-if="pairing.model.fh2Support === 'unsupported'" class="error">M3M ist derzeit für FlightHub 2 nicht unterstützt. Diese Hardwarekombination ist keine FlightHub-Freigabe.</p>
          <ul><li v-for="module in pairing.model.modules" :key="module">{{ module }}</li></ul>
          <p class="hint">Modellprofil zur Planung. Datenzugriff, Sensorfunktionen und Cloud-Unterstützung werden erst nach einer echten Geräteanbindung geprüft.</p>
        </div>
        <p class="hint">Status: keine Live-Telemetrie · kein Gerätebefehl · kein Flugfreigabenachweis.</p>
      </div>
      <div v-else-if="deviceTab === 'observations'" class="observations">
        <p class="intro">Gerätebeobachtungen</p>
        <p class="hint">Live-Werte stammen ausschließlich aus dem serverseitigen FlightHub-On-Premises-Adapter. Beispiele und Importe sind separat gekennzeichnet.</p>
        <button type="button" :disabled="livePending" @click="refreshLive">{{ livePending ? 'Live-Daten werden abgerufen …' : 'Live-Daten abrufen' }}</button>
        <p v-if="liveNotice" class="error" role="alert">{{ liveNotice }}</p>
        <button type="button" @click="loadExample">Anonymisierte Beispieldaten laden</button>
        <label class="import-label" for="device-json">JSON-Schnappschuss manuell importieren</label>
        <textarea id="device-json" v-model="importText" rows="5" placeholder='{"schemaVersion":1,"devices":[{"key":"demo-rc","model":"rc-pro","gatewayKey":null,"online":true,"topologyAt":0,"osdAt":null}]}' spellcheck="false" />
        <button type="button" class="secondary" @click="importSnapshot">Schnappschuss prüfen</button>
        <p v-if="importError" class="error" role="alert">{{ importError }} Bisherige Daten wurden verworfen.</p>
        <p v-if="snapshot" class="source">Quelle: {{ snapshot.source === 'fixture' ? 'anonymisierte Beispieldaten' : snapshot.source === 'manual' ? 'manueller Import' : 'FlightHub On-Premises OpenAPI · letzter Abruf' }} · {{ observedDevices.length }} Geräte</p>
        <ul v-if="snapshot" class="observed-list">
          <li v-for="item in observedDevices" :key="item.key">
            <strong>{{ item.name }}</strong><span class="alias">{{ item.key }}{{ item.gatewayKey ? ' · Gateway ' + item.gatewayKey : ' · Controller' }}</span>
            <span v-if="item.support === 'unsupported'" class="error">Für FlightHub 2 derzeit nicht unterstützt</span>
            <dl>
              <div><dt>Topologie</dt><dd :data-state="item.online">{{ item.online === 'online' ? 'ONLINE · gemeldet' : item.online === 'offline' ? 'OFFLINE · gemeldet' : 'UNBEKANNT' }}</dd></div>
              <div><dt>OSD</dt><dd :data-state="item.osd">{{ item.osd === 'fresh' ? 'Aktuell · gemeldet' : 'UNBEKANNT' }}</dd></div>
            </dl>
          </li>
        </ul>
        <p v-else-if="!importError" class="hint">Noch keine Daten geladen.</p>
        <p class="hint">Topologie gilt höchstens 60 Sekunden, OSD höchstens 10 Sekunden als aktuell. Der OpenAPI-Topologieabruf enthält keinen verifizierten OSD-Zeitstempel; Live-OSD bleibt deshalb UNBEKANNT. Ohne frisches Gateway wird das Fluggerät unbekannt angezeigt. Dies ist keine Flugfreigabe.</p>
      </div>
      <div v-else-if="deviceTab === 'dock4'">
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
      <div v-else class="simulator">
        <p class="sim-badge">SIMULATION · OFFLINE</p>
        <p class="intro">O4 → Dock 4 → Matrice 5TD</p>
        <p class="hint">Illustrative Zustandsfolge ohne echte Geräte, DJI-Protokollnachrichten oder Flugsteuerung. Die Werte stammen ausschließlich aus diesem Panel.</p>
        <p class="assessment" :data-result="simulation.phase === 'link-lost' ? 'blocked' : 'unknown'" role="status">{{ simReadout.description }}</p>
        <dl class="sim-readout">
          <div><dt>O4 Ground Station · Gateway</dt><dd>{{ simReadout.gateway }}</dd></div>
          <div><dt>DJI Dock 4 · Untergerät</dt><dd>{{ simReadout.dock }}</dd></div>
          <div><dt>Matrice 5TD · Untergerät</dt><dd>{{ simReadout.aircraft }}</dd></div>
          <div><dt>Dock-Abdeckung</dt><dd>{{ simReadout.cover }}</dd></div>
          <div><dt>Fluggerät</dt><dd>{{ simReadout.aircraftLocation }}</dd></div>
          <div><dt>Beispielaufgabe</dt><dd>{{ simReadout.task }}</dd></div>
        </dl>
        <div class="sim-actions">
          <button type="button" v-if="simulation.phase === 'off'" @click="simulate('start')">Simulation starten</button>
          <button type="button" v-if="['idle', 'preparing', 'operating', 'recovering'].includes(simulation.phase)" @click="simulate('next')">Nächster Simulationsschritt</button>
          <button type="button" v-if="simulation.phase !== 'off' && simulation.phase !== 'link-lost'" class="secondary" @click="simulate('lose-link')">Verbindungsverlust simulieren</button>
          <button type="button" v-if="simulation.phase === 'link-lost'" @click="simulate('restore')">Verbindung wiederherstellen</button>
          <button type="button" v-if="simulation.phase !== 'off'" class="secondary" @click="simulate('reset')">Zurücksetzen</button>
        </div>
        <div v-if="simulation.events.length" class="sim-events">
          <h3>Simulationsverlauf</h3>
          <ol><li v-for="(event, index) in simulation.events" :key="index">{{ event }}</li></ol>
        </div>
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
.sim-badge { display: inline-block; padding: 4px 7px; margin-bottom: 10px; color: #171d22; background: #f2cf8b; font-size: 11px; font-weight: 800; letter-spacing: .04em; }
.sim-actions { display: grid; gap: 8px; }
.sim-actions .secondary { color: #edf3f5; background: #35444e; border: 1px solid #52636d; }
.sim-events { margin-top: 18px; border-top: 1px solid #35444e; padding-top: 12px; }
.sim-events ol { padding-left: 20px; margin: 8px 0 0; font-size: 12px; color: #bdcbd2; }
.sim-events li { margin: 5px 0; }
.observations > button { margin-bottom: 10px; }
.observations .secondary { color: #edf3f5; background: #35444e; border: 1px solid #52636d; }
.import-label { display: block; margin-top: 8px; color: #bdcbd2; font-size: 12px; }
textarea { box-sizing: border-box; width: 100%; min-height: 106px; margin: 6px 0 10px; padding: 8px; color: #edf3f5; background: #24323b; border: 1px solid #52636d; border-radius: 4px; font: 12px/1.4 ui-monospace, monospace; resize: vertical; }
textarea:focus-visible { outline: 2px solid #94dbcb; outline-offset: 2px; }
.source { font-size: 12px; color: #f2cf8b; margin: 8px 0 12px; }
.observed-list { list-style: none; padding: 0; margin: 0 0 16px; }
.observed-list li { padding: 11px 0; border-top: 1px solid #35444e; }
.observed-list .alias { display: block; font-size: 12px; color: #bdcbd2; overflow-wrap: anywhere; }
.observed-list dl { margin: 6px 0 0; }
.observed-list dl div { padding: 3px 0; border: 0; }
.observed-list dd[data-state="online"], .observed-list dd[data-state="fresh"] { color: #94dbcb; }
.observed-list dd[data-state="offline"] { color: #ffbea8; }
</style>
