import { createViewState, definePlugin, isPluginError } from 'fh2-plugin-sdk'
import type { AppCockpitContext } from './generated/plugin-types'
import { statusPanel } from './views/status-panel/contract'
import type { StatusState } from './views/status-panel/contract'

export default definePlugin({
  async activate (context) {
    if (context.host.id !== 'cockpit') return
    const ctx = context as AppCockpitContext
    const state = createViewState<StatusState>({ phase: 'idle', detail: '' })
    async function refresh () {
      if (state.get().phase === 'loading') return
      state.update(() => ({ phase: 'loading', detail: '' }))
      try {
        const response = await ctx.apiCall<{ code: number; data: { service: string; version: string } }>('/plugin/invoke', {
          method: 'POST',
          body: { pluginId: 'exp_flugdeck_backend', handler: 'flugdeck.status', input: {} },
        })
        if (response?.code !== 0 || response.data?.service !== 'flugdeck' || typeof response.data.version !== 'string' || !response.data.version.trim()) {
          throw new Error('Unerwartete Antwort vom Flugdeck-Backend.')
        }
        state.update(() => ({ phase: 'ready', detail: response.data.version }))
      } catch (error) {
        const detail = isPluginError(error) ? error.detail as { gatewayCode?: number } | undefined : undefined
        const message = error instanceof Error ? error.message : 'Backend-Anfrage fehlgeschlagen.'
        state.update(() => ({ phase: 'error', detail: detail?.gatewayCode ? message + ' (Gateway ' + detail.gatewayCode + ')' : message }))
      }
    }
    await statusPanel.handle(ctx, { state, methods: { refresh } })
    await ctx.extensions.contribute('status-panel', {
      visible: true, icon: 'flugdeck', label: 'Flugdeck', render: () => statusPanel.get(ctx),
    })
  },
})
