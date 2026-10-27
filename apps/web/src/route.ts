export type Route =
  | { name: 'home' }
  | { name: 'request' }
  | { name: 'job'; id: string }
  | { name: 'programme'; id: string }
  | { name: 'call'; versionId: string; level: string; drillLineId?: string }
  | { name: 'debrief'; callId: string }
  | { name: 'report'; versionId: string }

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent)
  const [a, b, c, d, e] = parts
  if (parts.length === 0) return { name: 'home' }
  if (a === 'new' && parts.length === 1) return { name: 'request' }
  if (a === 'job' && b) return { name: 'job', id: b }
  if (a === 'p' && b) return { name: 'programme', id: b }
  if (a === 'call' && b && c) return d === 'drill' && e ? { name: 'call', versionId: b, level: c, drillLineId: e } : { name: 'call', versionId: b, level: c }
  if (a === 'debrief' && b) return { name: 'debrief', callId: b }
  if (a === 'report' && b) return { name: 'report', versionId: b }
  return { name: 'home' }
}

const enc = encodeURIComponent

export function href(r: Route): string {
  switch (r.name) {
    case 'home': return '#/'
    case 'request': return '#/new'
    case 'job': return `#/job/${enc(r.id)}`
    case 'programme': return `#/p/${enc(r.id)}`
    case 'call': return `#/call/${enc(r.versionId)}/${enc(r.level)}${r.drillLineId ? `/drill/${enc(r.drillLineId)}` : ''}`
    case 'debrief': return `#/debrief/${enc(r.callId)}`
    case 'report': return `#/report/${enc(r.versionId)}`
  }
}

export const navigate = (r: Route) => { window.location.hash = href(r) }
