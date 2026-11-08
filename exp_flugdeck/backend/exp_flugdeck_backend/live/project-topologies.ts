/** Narrow projection of FlightHub On-Premises OpenAPI V2 topology responses. */
type Model = 'rc-pro' | 'rc-plus-2' | 'm3e' | 'm3t' | 'm4t'
type Node = { device_sn?: unknown; device_model?: { name?: unknown }; device_online_status?: unknown; is_device_pending_offline?: unknown; device_state?: unknown }
type Topology = { host?: unknown; parents?: unknown }

function object (value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function model (name: unknown): Model | null {
  if (typeof name !== 'string') return null
  const normalized = name.toLowerCase().replace(/\s+/g, ' ').trim()
  if (normalized.includes('rc plus 2')) return 'rc-plus-2'
  if (normalized.includes('rc pro')) return 'rc-pro'
  if (normalized.includes('mavic 3m')) return null // Not supported in this FlightHub project.
  if (normalized.includes('mavic 3e') || normalized.includes('mavic 3 enterprise')) return 'm3e'
  if (normalized.includes('mavic 3t') || normalized.includes('mavic 3 thermal')) return 'm3t'
  if (normalized.includes('matrice 4t')) return 'm4t'
  return null
}
function asNode (value: unknown): (Node & { device_sn: string; model: Model }) | null {
  if (!object(value) || typeof value.device_sn !== 'string' || !object(value.device_model)) return null
  const known = model(value.device_model.name)
  return known ? { ...value, device_sn: value.device_sn, model: known } : null
}

export function projectTopologies (body: unknown, fetchedAt: number) {
  if (!object(body) || body.code !== 0 || !object(body.data) || !Array.isArray(body.data.list) || body.data.list.length > 100) {
    throw new Error('Ungültige Topologie-Antwort.')
  }
  const keyed = new Map<string, { sn: string; model: Model; gatewaySn: string | null; online: boolean | null }>()
  function add (node: ReturnType<typeof asNode>, gatewaySn: string | null) {
    if (!node) return
    const status = node.is_device_pending_offline === false && node.device_state !== null && typeof node.device_online_status === 'boolean'
      ? node.device_online_status : null
    const previous = keyed.get(node.device_sn)
    if (previous && (previous.model !== node.model || previous.gatewaySn !== gatewaySn)) throw new Error('Widersprüchliche Topologie.')
    keyed.set(node.device_sn, { sn: node.device_sn, model: node.model, gatewaySn, online: status })
  }
  for (const item of body.data.list as Topology[]) {
    if (!object(item) || !Array.isArray(item.parents) || item.parents.length > 20) throw new Error('Ungültige Topologie-Struktur.')
    const host = asNode(item.host)
    const parents = item.parents.map(asNode)
    for (const parent of parents) if (parent?.model === 'rc-pro' || parent?.model === 'rc-plus-2') add(parent, null)
    if (host && host.model !== 'rc-pro' && host.model !== 'rc-plus-2') {
      const gateway = parents.find(parent => parent && (parent.model === 'rc-pro' || parent.model === 'rc-plus-2'))
      if (gateway) add(host, gateway.device_sn)
    }
  }
  if (keyed.size > 20) throw new Error('Zu viele Geräte in der Projektion.')
  const sorted = [...keyed.values()].sort((a, b) => a.sn.localeCompare(b.sn))
  const aliases = new Map(sorted.map((device, index) => [device.sn, `live-device-${index + 1}`]))
  return {
    schemaVersion: 1 as const, source: 'live' as const, fetchedAt,
    devices: sorted.map(device => ({
      key: aliases.get(device.sn)!, model: device.model, gatewayKey: device.gatewaySn ? aliases.get(device.gatewaySn) ?? null : null,
      online: device.online, topologyAt: fetchedAt, osdAt: null,
    })),
  }
}
