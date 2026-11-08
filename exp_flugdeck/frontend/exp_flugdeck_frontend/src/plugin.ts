import { definePlugin } from 'fh2-plugin-sdk'
import type { PluginContext } from 'fh2-plugin-sdk'
import type { AppCockpitContext, AppMessageContext, AppPlanContext, AppProjectContext } from './generated/plugin-types'

/** Einstieg: verteilt die Aktivierung auf das Modul des jeweiligen Hosts. */
export default definePlugin({
  async activate (ctx: PluginContext) {
    switch (ctx.host.id) {
      case 'cockpit': return (await import('./hosts/cockpit/activate')).activate(ctx as AppCockpitContext)
      case 'project': return (await import('./hosts/project/activate')).activate(ctx as AppProjectContext)
      case 'plan': return (await import('./hosts/plan/activate')).activate(ctx as AppPlanContext)
      case 'message': return (await import('./hosts/message/activate')).activate(ctx as AppMessageContext)
      default: return undefined
    }
  },
})
