// @vitest-environment happy-dom
import { createApp, nextTick } from 'vue'
import { expect, it, vi } from 'vitest'
import Panel from '../src/views/status-panel/Panel.vue'
import { initialStatus } from '../src/views/status-panel/contract'
import type { StatusClient, StatusState } from '../src/views/status-panel/contract'

it('zeigt Ergebnis und Fehler im gemounteten Panel und räumt das Abonnement auf', async () => {
  let update!: (state: StatusState) => void
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
  const button = target.querySelector('button')!
  button.click()
  await Promise.resolve()
  update({ ...initialStatus, phase: 'loading' })
  await nextTick()
  expect(button.disabled).toBe(true)
  update({ phase: 'ready', detail: '0.2.0', checkedAt: 1700000000000, durationMs: 12 })
  await nextTick()
  expect(target.textContent).toContain('Erreichbar')
  expect(target.textContent).toContain('12 ms')
  expect(target.textContent).toContain('0.2.0')
  update({ phase: 'error', detail: 'Gateway unterbrochen', checkedAt: 1700000000012, durationMs: 8 })
  await nextTick()
  expect(target.textContent).toContain('Gateway unterbrochen')
  expect(target.textContent).not.toContain('0.2.0')
  app.unmount()
  expect(dispose).toHaveBeenCalledOnce()
})
