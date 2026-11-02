import { METHODS, validateProgramme } from '@roleplay/core'
import { describe, expect, it } from 'vitest'
import { buildApp } from '../src/app'
import { loadLibrary, readSeeds, SEED_DIR } from '../src/library'
import { LIBRARY, openStore } from '../src/store'
import { scripted } from './helpers'

const seeds = readSeeds(SEED_DIR)
const methodIds = new Set(METHODS.map((m) => `M:${m.slug}`))

describe('ready-built seeds', () => {
  it('there is one seed per programme, plus a Vietnamese version of every English one', () => {
    const originals = seeds.filter((s) => !s.variant).map((s) => s.slug ?? s.caseId).sort()
    expect(originals).toEqual(['bank_insurance_sale', 'bank_scam_stop', 'customer_service', 'er_wait_relative', 'manager_conversations', 'outage_call', 'partner_certification', 'regulated_messaging', 'sales_onboarding', 'site_safety_stop'])
    expect(seeds.filter((s) => s.variant === 'vi').map((s) => s.slug ?? s.caseId).sort()).toEqual(['bank_insurance_sale', 'bank_scam_stop', 'er_wait_relative', 'manager_conversations', 'outage_call', 'partner_certification', 'regulated_messaging', 'sales_onboarding', 'site_safety_stop'])
  })

  it('every Vietnamese version is written in Vietnamese, down to its sample call', () => {
    const vietnamese = /[\u00C0-\u024F\u1E00-\u1EFF]/
    for (const s of seeds.filter((x) => x.variant === 'vi')) {
      expect(s.programme.language, s.caseId).toBe('vi')
      expect(s.programme.title, s.caseId).toMatch(vietnamese)
      for (const r of s.programme.rubric) expect(r.text, s.caseId).toMatch(vietnamese)
      for (const l of s.programme.levels) expect(l.opening, s.caseId).toMatch(vietnamese)
      for (const t of s.sampleCall.turns) expect(t.text, s.caseId).toMatch(vietnamese)
      for (const i of s.brief.items) expect(i.gives, `${s.caseId} ${i.sourceId}`).toMatch(vietnamese)
    }
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
    expect(seeds.find((s) => s.caseId === 'customer_service' && !s.slug)!.programme.language).toBe('vi')
  })
})

describe('loadLibrary', () => {
  it('boot loads nineteen published library programmes, and loading twice changes nothing', async () => {
    const store = openStore(':memory:')
    loadLibrary(store, seeds)
    loadLibrary(store, seeds)
    const list = store.listProgrammes('someone')
    expect(list).toHaveLength(19)
    expect(list.every((p) => p.readyBuilt && p.status === 'published')).toBe(true)
    expect(list.every((p) => store.versionsOf(p.id).length === 1)).toBe(true)
  })

  it('a seed with its own slug becomes its own programme, even when another seed shares its case type', () => {
    const base = seeds.find((s) => s.caseId === 'regulated_messaging' && !s.variant && !s.slug)!
    const store = openStore(':memory:')
    loadLibrary(store, [base, { ...base, slug: 'bank_insurance_sale' }])
    const ids = store.listProgrammes('someone').map((p) => p.id).sort()
    expect(ids).toEqual(['lib-bank_insurance_sale', 'lib-regulated_messaging'])
    expect(store.call(LIBRARY, 'lib-bank_insurance_sale-sample')).not.toBeNull()
  })

  it('a language version is its own programme, with its own sample call', async () => {
    const store = openStore(':memory:')
    loadLibrary(store, seeds)
    const app = buildApp({ store, dailyUsd: 10, meta: scripted([]), open: null, searchPapers: async () => [], doiResolves: async () => true })
    const headers = { 'x-visitor-id': 'cccccccc-0000-0000-0000-000000000004' }
    const vi = (await app.inject({ method: 'GET', url: '/api/programmes/lib-outage_call-vi', headers })).json()
    const en = (await app.inject({ method: 'GET', url: '/api/programmes/lib-outage_call', headers })).json()
    expect(vi.programme.language).toBe('vi')
    expect(en.programme.language).toBe('en')
    expect(vi.sampleCallId).toBe('lib-outage_call-vi-sample')
    expect(en.sampleCallId).toBe('lib-outage_call-sample')
    expect(vi.versions[0].id).not.toBe(en.versions[0].id)
    const call = (await app.inject({ method: 'GET', url: '/api/calls/lib-outage_call-vi-sample', headers })).json()
    expect(call.language).toBe('vi')
    expect(call.sample).toBe(true)
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
