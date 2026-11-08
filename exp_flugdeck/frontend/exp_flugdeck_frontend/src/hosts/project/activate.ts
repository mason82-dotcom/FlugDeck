import { createViewState } from 'fh2-plugin-sdk'
import { createFlugdeckApi, describeFailure } from '../../api/flugdeck-api'
import type { AppProjectContext } from '../../generated/plugin-types'
import { flightlogPage, initialFlightlog } from '../../views/flightlog-page/contract'
import type { FlightlogState } from '../../views/flightlog-page/contract'

/** Project: Seitenleisten-Eintrag „Flugbuch“ mit der Flugliste des aktuellen Projekts. */
export async function activate (ctx: AppProjectContext) {
  const api = createFlugdeckApi(ctx.apiCall)
  const state = createViewState<FlightlogState>(initialFlightlog)
  let subscription: { dispose (): void } | undefined
  let generation = 0

  async function reload () {
    const projectId = state.get().projectId
    if (ctx.lifecycle.disposed) return
    if (!projectId) {
      state.update(current => ({ ...current, phase: 'error', items: [], total: 0, message: 'Kein Projekt ausgewählt.' }))
      return
    }
    const request = ++generation
    state.update(current => ({ ...current, phase: 'loading', message: '' }))
    try {
      const list = await api.listFlights(projectId)
      if (ctx.lifecycle.disposed || request !== generation) return
      state.update(current => ({ ...current, phase: 'ready', items: list.items, total: list.total }))
    } catch (error) {
      if (ctx.lifecycle.disposed || request !== generation) return
      state.update(current => ({ ...current, phase: 'error', message: describeFailure(error) }))
    }
  }

  function applyProject (projectId: string | null) {
    if (projectId === state.get().projectId) return
    state.update(() => ({ ...initialFlightlog, projectId }))
    void reload()
  }

  await flightlogPage.handle(ctx, { state, methods: { reload } })
  await ctx.extensions.contribute('flightlog-sidebar', {
    icon: 'flugdeck', label: 'Flugbuch', disabled: false, showBadge: false,
    render: () => flightlogPage.get(ctx),
  })

  try {
    const project = await ctx.capabilities.get('project:context')
    if (project) {
      applyProject((await project.getState()).projectId)
      subscription = await project.onStateChanged(next => applyProject(next.projectId))
    } else {
      ctx.logger.warn('project:context ist im Host nicht verfügbar')
    }
  } catch (error) {
    ctx.logger.error('Projektkontext konnte nicht gelesen werden', { errorMessage: describeFailure(error) })
  }

  return { dispose: async () => { subscription?.dispose() } }
}
