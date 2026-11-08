// @vitest-environment happy-dom
import { createApp, nextTick } from 'vue'
import { expect, it, vi } from 'vitest'
import Panel from '../src/views/status-panel/Panel.vue'
import { initialBackend, initialPanel } from '../src/views/status-panel/contract'
import type { CockpitPanelState, StatusClient } from '../src/views/status-panel/contract'
import { emptyReadout } from '../src/domain/telemetry'

it('zeigt Backend-Status, Telemetrie und Flugbuch und räumt das Abonnement auf', async () => {
  let update!: (state: CockpitPanelState) => void
  const dispose = vi.fn()
  const client = {
    state: { subscribe (listener: typeof update) { update = listener; return { dispose } } },
    refresh: vi.fn().mockRejectedValueOnce(new Error('View-Kanal unterbrochen')).mockResolvedValue(undefined),
  }
  const target = document.createElement('div')
  const app = createApp(Panel, { client: client as unknown as StatusClient })
  app.mount(target)
  await Promise.resolve()
  await nextTick()
  expect(target.textContent).toContain('Panelverbindung gestört')
  expect(target.textContent).toContain('Der Host stellt keine Telemetrie bereit.')
  const button = target.querySelector('button')!
  button.click()
  await Promise.resolve()
  update({ ...initialPanel, backend: { ...initialBackend, phase: 'loading' } })
  await nextTick()
  expect(button.disabled).toBe(true)
  update({
    backend: { phase: 'ready', detail: '0.3.0', checkedAt: 1700000000000, durationMs: 12 },
    telemetry: { ...emptyReadout, heightM: 42.04, horizontalSpeedMs: 7.5, hasFlightControl: true },
    flight: { ...initialPanel.flight, phase: 'recording', flightKey: 'f-1', startedAt: 1700000000000, maxHeightM: 55 },
  })
  await nextTick()
  const text = target.textContent!
  expect(text).toContain('Erreichbar')
  expect(text).toContain('12 ms')
  expect(text).toContain('0.3.0')
  expect(text).toContain('42,0 m')
  expect(text).toContain('7,5 m/s')
  expect(text).toContain('Flug wird protokolliert')
  expect(text).toContain('55,0 m')
  update({ ...initialPanel, backend: { phase: 'error', detail: 'Gateway unterbrochen', checkedAt: 1700000000012, durationMs: 8 } })
  await nextTick()
  expect(target.textContent).toContain('Gateway unterbrochen')
  expect(target.textContent).not.toContain('0.3.0')
  app.unmount()
  expect(dispose).toHaveBeenCalledOnce()
})
