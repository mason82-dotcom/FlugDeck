import { createViewState } from 'fh2-plugin-sdk'
import { createFlugdeckApi, describeFailure } from '../../api/flugdeck-api'
import { createFlightTracker } from '../../domain/flight-tracker'
import { toReadout } from '../../domain/telemetry'
import type { AppCockpitContext } from '../../generated/plugin-types'
import { initialBackend, initialPanel, statusPanel } from '../../views/status-panel/contract'
import type { CockpitPanelState } from '../../views/status-panel/contract'

interface Disposable { dispose (): void }

/** Cockpit: Linkspanel mit Backend-Status, Live-Telemetrie und automatischem Flugbuch. */
export async function activate (ctx: AppCockpitContext) {
  const api = createFlugdeckApi(ctx.apiCall)
  const state = createViewState<CockpitPanelState>(initialPanel)
  const subscriptions: Disposable[] = []
  const tracker = createFlightTracker({
    api,
    now: () => Date.now(),
    onChange: flight => { if (!ctx.lifecycle.disposed) state.update(current => ({ ...current, flight })) },
  })

  async function refresh () {
    if (ctx.lifecycle.disposed || state.get().backend.phase === 'loading') return
    const startedAt = Date.now()
    state.update(current => ({ ...current, backend: { ...initialBackend, phase: 'loading' } }))
    function complete (phase: 'ready' | 'error', detail: string) {
      if (ctx.lifecycle.disposed) return
      const checkedAt = Date.now()
      state.update(current => ({ ...current, backend: { phase, detail, checkedAt, durationMs: Math.max(0, checkedAt - startedAt) } }))
    }
    try {
      complete('ready', (await api.status()).version)
    } catch (error) {
      complete('error', describeFailure(error))
    }
  }

  async function connect () {
    try {
      const telemetry = await ctx.capabilities.get('cockpit:telemetry')
      if (telemetry) {
        const apply = (next: ReturnType<typeof toReadout>) => {
          if (ctx.lifecycle.disposed) return
          state.update(current => ({ ...current, telemetry: next }))
          tracker.sample(next)
        }
        apply(toReadout(await telemetry.getState()))
        subscriptions.push(await telemetry.onStateChanged(event => apply(toReadout(event.state))))
      } else {
        ctx.logger.warn('cockpit:telemetry ist im Host nicht verfügbar')
      }
    } catch (error) {
      ctx.logger.error('Telemetrie konnte nicht abonniert werden', { errorMessage: describeFailure(error) })
    }
    try {
      const cockpit = await ctx.capabilities.get('cockpit:context')
      if (cockpit) {
        void tracker.update(await cockpit.getState())
        subscriptions.push(await cockpit.onStateChanged(next => { void tracker.update(next) }))
      } else {
        ctx.logger.warn('cockpit:context ist im Host nicht verfügbar; Flugbuch bleibt inaktiv')
      }
    } catch (error) {
      ctx.logger.error('Cockpit-Kontext konnte nicht abonniert werden', { errorMessage: describeFailure(error) })
    }
  }

  await statusPanel.handle(ctx, { state, methods: { refresh } })
  await ctx.extensions.contribute('status-panel', {
    visible: true, icon: 'flugdeck', label: 'Flugdeck', render: () => statusPanel.get(ctx),
  })
  await connect()

  return {
    dispose: async () => {
      tracker.dispose()
      for (const subscription of subscriptions.splice(0)) subscription.dispose()
    },
  }
}
