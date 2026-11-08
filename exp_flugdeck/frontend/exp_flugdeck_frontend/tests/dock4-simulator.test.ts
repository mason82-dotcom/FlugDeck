import { expect, it } from 'vitest'
import { advanceSimulation, initialSimulation, simulationReadout } from '../src/views/status-panel/dock4-simulator'

it('durchläuft nur explizite lokale Schritte und beendet die Beispielaufgabe im Dock', () => {
  let state = initialSimulation
  expect(advanceSimulation(state, 'next')).toBe(state)
  for (const [action, expected] of [
    ['start', 'idle'], ['next', 'preparing'], ['next', 'operating'],
    ['next', 'recovering'], ['next', 'complete'],
  ] as const) {
    state = advanceSimulation(state, action)
    expect(state.phase).toBe(expected)
  }
  expect(simulationReadout(state).aircraftLocation).toBe('Im Dock')
  expect(advanceSimulation(state, 'next')).toBe(state)
  expect(state.events).toHaveLength(5)
})

it('verwirft nach Linkverlust veraltete Gerätewerte und setzt eine Aufgabe nicht automatisch fort', () => {
  const operating = advanceSimulation(advanceSimulation(advanceSimulation(initialSimulation, 'start'), 'next'), 'next')
  expect(simulationReadout(operating).cover).toBe('Offen')
  const lost = advanceSimulation(operating, 'lose-link')
  expect(simulationReadout(lost)).toMatchObject({ dock: 'Unbekannt', aircraftLocation: 'Unbekannt', task: 'Unbekannt' })
  expect(advanceSimulation(lost, 'next')).toBe(lost)
  const restored = advanceSimulation(lost, 'restore')
  expect(restored.phase).toBe('idle')
  expect(simulationReadout(restored).task).toBe('Leerlauf')
  expect(advanceSimulation(restored, 'reset')).toEqual(initialSimulation)
})
