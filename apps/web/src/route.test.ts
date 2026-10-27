import { describe, expect, it } from 'vitest'
import { href, parseHash, type Route } from './route'

describe('routes', () => {
  it('parseHash round-trips every route', () => {
    const routes: Route[] = [
      { name: 'home' },
      { name: 'request' },
      { name: 'job', id: 'j1' },
      { name: 'programme', id: 'p1' },
      { name: 'call', versionId: 'v1', level: 'L2' },
      { name: 'debrief', callId: 'c1' },
      { name: 'report', versionId: 'v1' },
    ]
    for (const r of routes) expect(parseHash(href(r))).toEqual(r)
  })

  it('unknown hashes go home', () => {
    expect(parseHash('#/nope/x')).toEqual({ name: 'home' })
    expect(parseHash('')).toEqual({ name: 'home' })
  })

  it('drill calls carry the line id', () => {
    const r: Route = { name: 'call', versionId: 'v1', level: 'L1', drillLineId: 'r2' }
    expect(parseHash(href(r))).toEqual(r)
  })
})
