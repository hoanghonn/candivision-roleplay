import { METHODS, validateProgramme } from '@roleplay/core'
import { describe, expect, it } from 'vitest'
import { buildApp } from '../src/app'
import { loadLibrary, readSeeds, SEED_DIR } from '../src/library'
import { LIBRARY, openStore } from '../src/store'
import { scripted } from './helpers'

const seeds = readSeeds(SEED_DIR)
const methodIds = new Set(METHODS.map((m) => `M:${m.slug}`))

describe('ready-built seeds', () => {
  it('there is one seed per case', () => {
    expect(seeds.map((s) => s.caseId).sort()).toEqual(['customer_service', 'manager_conversations', 'outage_call', 'partner_certification', 'regulated_messaging', 'sales_onboarding'])
  })

  it('every seed validates against its own brief and files', () => {
    for (const s of seeds) expect(validateProgramme(s.programme, s.brief, s.files), s.caseId).toEqual([])
  })

  it("every seed's sources are in the method library or are papers with a DOI", () => {
    for (const s of seeds) for (const src of s.brief.sources) expect(methodIds.has(src.id) || /^P:10\.\d{4,}\//.test(src.id), `${s.caseId} ${src.id}`).toBe(true)
  })

  it('every seed passed its test call and has a scored sample call', () => {
    for (const s of seeds) {
      expect(s.testCall.ok, s.caseId).toBe(true)
      expect(s.sampleCall.verdicts).toHaveLength(s.programme.rubric.length)
    }
  })

  it('the customer_service seed is in Vietnamese', () => {
    expect(seeds.find((s) => s.caseId === 'customer_service')!.programme.language).toBe('vi')
  })
})

describe('loadLibrary', () => {
  it('boot loads six published library programmes, and loading twice changes nothing', async () => {
    const store = openStore(':memory:')
    loadLibrary(store, seeds)
    loadLibrary(store, seeds)
    const list = store.listProgrammes('someone')
    expect(list).toHaveLength(6)
    expect(list.every((p) => p.readyBuilt && p.status === 'published')).toBe(true)
    expect(list.every((p) => store.versionsOf(p.id).length === 1)).toBe(true)
  })

  it('anyone can read the sample call of a ready-built programme but not settle it', async () => {
    const store = openStore(':memory:')
    loadLibrary(store, seeds)
    const app = buildApp({ store, dailyUsd: 10, meta: scripted([]), open: null, searchPapers: async () => [], doiResolves: async () => true })
    const V = 'cccccccc-0000-0000-0000-000000000003'
    const detail = (await app.inject({ method: 'GET', url: '/api/programmes/lib-outage_call', headers: { 'x-visitor-id': V } })).json()
    expect(detail.sampleCallId).toBe('lib-outage_call-sample')
    const call = (await app.inject({ method: 'GET', url: '/api/calls/lib-outage_call-sample', headers: { 'x-visitor-id': V } })).json()
    expect(call.debrief.lines.length).toBeGreaterThan(0)
    expect(call.sample).toBe(true)
    const settle = await app.inject({ method: 'POST', url: '/api/calls/lib-outage_call-sample/settle', headers: { 'x-visitor-id': V }, payload: { lineId: 'x', result: 'pass' } })
    expect(settle.statusCode).toBe(404)
    expect(store.call(LIBRARY, 'lib-outage_call-sample')).not.toBeNull()
  })
})
