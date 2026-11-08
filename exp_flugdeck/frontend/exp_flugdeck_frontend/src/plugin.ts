import { createViewState, definePlugin, isPluginError } from 'fh2-plugin-sdk'
import type { AppCockpitContext } from './generated/plugin-types'
import { initialStatus, statusPanel } from './views/status-panel/contract'
import type { StatusState } from './views/status-panel/contract'

const timeoutMs = 8000
function isRecord (value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function describeFailure (error: unknown): string {
  if (isPluginError(error)) {
    if (error.code === 'TIMEOUT') return 'Innerhalb von 8 Sekunden kam keine Antwort.'
    const detail = error.detail
    if (detail && typeof detail === 'object' && 'gatewayCode' in detail && typeof detail.gatewayCode === 'number') {
      return error.message + ' (Gateway ' + detail.gatewayCode + ')'
    }
    return error.message
  }
  return error instanceof Error ? error.message : 'Backend-Anfrage fehlgeschlagen.'
}

export default definePlugin({
  async activate (context) {
    if (context.host.id !== 'cockpit') return
    const ctx = context as AppCockpitContext
    const state = createViewState<StatusState>(initialStatus)

    async function refresh () {
      if (ctx.lifecycle.disposed || state.get().phase === 'loading') return
      const startedAt = Date.now()
      state.update(() => ({ ...initialStatus, phase: 'loading' }))
      function complete (phase: 'ready' | 'error', detail: string) {
        if (ctx.lifecycle.disposed) return
        const checkedAt = Date.now()
        state.update(() => ({ phase, detail, checkedAt, durationMs: Math.max(0, checkedAt - startedAt) }))
      }
      try {
        const response = await ctx.apiCall<{ code: number; data: { service: string; version: string } }>('/plugin/invoke', {
          method: 'POST', timeoutMs,
          body: { pluginId: 'exp_flugdeck_backend', handler: 'flugdeck.status', input: {} },
        })
        if (response?.code !== 0 || response.data?.service !== 'flugdeck' || typeof response.data.version !== 'string' || !response.data.version.trim()) {
          throw new Error('Unerwartete Antwort vom Flugdeck-Backend.')
        }
        complete('ready', response.data.version)
      } catch (error) {
        complete('error', describeFailure(error))
      }
    }
    async function refreshLive (): Promise<string> {
      if (ctx.lifecycle.disposed) throw new Error('Plugin wurde entladen.')
      const response = await ctx.apiCall('/plugin/invoke', {
        method: 'POST', timeoutMs,
        body: { pluginId: 'exp_flugdeck_backend', handler: 'flugdeck.devices', input: {} },
      })
      if (ctx.lifecycle.disposed || !isRecord(response) || response.code !== 0) {
        throw new Error('Gerätedaten konnten nicht abgerufen werden.')
      }
      return JSON.stringify(response.data ?? null)
    }
    await statusPanel.handle(ctx, { state, methods: { refresh, refreshLive } })
    await ctx.extensions.contribute('status-panel', {
      visible: true, icon: 'flugdeck', label: 'Flugdeck', render: () => statusPanel.get(ctx),
    })
  },
})
