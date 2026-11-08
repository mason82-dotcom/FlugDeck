/** Illustrative, local-only state machine. No DJI wire format, identifiers or commands. */
export type SimPhase = 'off' | 'idle' | 'preparing' | 'operating' | 'recovering' | 'complete' | 'link-lost'
export type SimAction = 'start' | 'next' | 'lose-link' | 'restore' | 'reset'

export interface Dock4Simulation {
  phase: SimPhase
  step: number
  events: readonly string[]
}

export const initialSimulation: Dock4Simulation = { phase: 'off', step: 0, events: [] }

const nextPhase: Partial<Record<SimPhase, SimPhase>> = {
  idle: 'preparing', preparing: 'operating', operating: 'recovering', recovering: 'complete',
}

const descriptions: Record<SimPhase, string> = {
  off: 'Simulation gestoppt',
  idle: 'O4, Dock 4 und Matrice 5TD verbunden; Fluggerät im Dock',
  preparing: 'Beispielaufgabe wird vorbereitet',
  operating: 'Beispielaufgabe läuft; Fluggerät außerhalb des Docks',
  recovering: 'Beispielaufgabe wird abgeschlossen; Rückkehr dargestellt',
  complete: 'Fluggerät wieder im Dock; Beispielaufgabe beendet',
  'link-lost': 'Verbindung verloren; Gerätezustand unbekannt',
}

export function advanceSimulation (state: Dock4Simulation, action: SimAction): Dock4Simulation {
  if (action === 'reset') return initialSimulation
  let phase: SimPhase | undefined
  if (action === 'start' && state.phase === 'off') phase = 'idle'
  if (action === 'next') phase = nextPhase[state.phase]
  if (action === 'lose-link' && state.phase !== 'off' && state.phase !== 'link-lost') phase = 'link-lost'
  // A recovered transport never resurrects a stale task or telemetry reading.
  if (action === 'restore' && state.phase === 'link-lost') phase = 'idle'
  if (!phase) return state
  return { phase, step: state.step + 1, events: [...state.events.slice(-5), descriptions[phase]] }
}

export function simulationReadout (state: Dock4Simulation) {
  const phase = state.phase
  const known = phase !== 'off' && phase !== 'link-lost'
  return {
    description: descriptions[phase],
    gateway: known ? 'Online (simuliert)' : phase === 'link-lost' ? 'Verbindung verloren' : 'Aus',
    dock: known ? 'Online (simuliert)' : 'Unbekannt',
    aircraft: known ? 'Online (simuliert)' : 'Unbekannt',
    cover: !known ? 'Unbekannt' : phase === 'operating' || phase === 'recovering' ? 'Offen' : 'Geschlossen',
    aircraftLocation: !known ? 'Unbekannt' : phase === 'operating' || phase === 'recovering' ? 'Außerhalb des Docks' : 'Im Dock',
    task: !known ? 'Unbekannt' : phase === 'idle' || phase === 'complete' ? 'Leerlauf' : phase === 'preparing' ? 'Vorbereitung' : phase === 'operating' ? 'Läuft' : 'Abschluss',
  }
}
