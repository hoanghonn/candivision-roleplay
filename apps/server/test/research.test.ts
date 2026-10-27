import type { CaseMatch } from '@roleplay/core'
import { describe, expect, it } from 'vitest'
import type { Paper } from '../src/papers'
import { runResearch, type ResearchEvent } from '../src/research'
import { scripted, toolCall } from './helpers'

const match: CaseMatch = {
  caseId: 'outage_call',
  situation: 'An engineer calls a client after an outage',
  learnerRole: 'Engineer on call',
  counterpartRole: 'Client head of operations',
  language: 'en',
  stakes: 'Clients escalate to the CEO',
  readyMeans: [],
}

const paper: Paper = { doi: '10.1/real', title: 'Apologies after outages', authors: 'A. Author', year: 2020, abstract: 'An abstract.', link: 'https://doi.org/10.1/real', citations: 120 }

function deps(overrides: Partial<Parameters<typeof runResearch>[0]> & { client: Parameters<typeof runResearch>[0]['client'] }) {
  const events: ResearchEvent[] = []
  let searches = 0
  const d = {
    searchPapers: async () => { searches++; return [paper] },
    doiResolves: async (doi: string) => doi === '10.1/real',
    emit: (e: ResearchEvent) => events.push(e),
    ...overrides,
  }
  return { d, events, searches: () => searches }
}

describe('runResearch', () => {
  it('keeps verified items and builds sources from them', async () => {
    const client = scripted([
      toolCall('search_papers', { query: 'apology after outage' }),
      toolCall('submit_brief', { items: [{ sourceId: 'P:10.1/real', gives: 'Apologise first.', use: 'handle' }, { sourceId: 'M:incident-comms', gives: 'Give the next update time.', use: 'handle' }], notFound: ['Japanese norms'] }),
    ])
    const { d, events } = deps({ client })
    const brief = await runResearch(d, match, [])
    expect(brief.items.map((i) => i.sourceId)).toContain('P:10.1/real')
    expect(brief.sources.find((s) => s.id === 'P:10.1/real')?.summary).toBe('Apologise first.')
    expect(brief.notFound).toEqual(['Japanese norms'])
    expect(events).toContainEqual({ type: 'verified', sourceId: 'P:10.1/real', use: 'handle' })
    for (const item of brief.items) expect(brief.sources.some((s) => s.id === item.sourceId)).toBe(true)
  })

  it('a source the tools never returned is dropped', async () => {
    const client = scripted([toolCall('submit_brief', { items: [{ sourceId: 'P:10.9999/fake', gives: 'Invented.', use: 'handle' }], notFound: [] })])
    const { d, events } = deps({ client })
    const brief = await runResearch(d, match, [])
    expect(brief.items.some((i) => i.sourceId === 'P:10.9999/fake')).toBe(false)
    expect(events).toContainEqual(expect.objectContaining({ type: 'dropped', sourceId: 'P:10.9999/fake' }))
  })

  it('a DOI that does not resolve is dropped', async () => {
    const client = scripted([
      toolCall('search_papers', { query: 'x' }),
      toolCall('submit_brief', { items: [{ sourceId: 'P:10.1/real', gives: 'Apologise first.', use: 'handle' }], notFound: [] }),
    ])
    const { d, events } = deps({ client, doiResolves: async () => false })
    const brief = await runResearch(d, match, [])
    expect(brief.items.some((i) => i.sourceId === 'P:10.1/real')).toBe(false)
    expect(events).toContainEqual(expect.objectContaining({ type: 'dropped', sourceId: 'P:10.1/real', reason: expect.stringMatching(/DOI/) }))
  })

  it('search failure falls back to the library', async () => {
    const client = scripted([toolCall('search_papers', { query: 'x' }), toolCall('submit_brief', { items: [], notFound: [] })])
    const { d } = deps({ client, searchPapers: async () => { throw new Error('down') } })
    const brief = await runResearch(d, match, [])
    expect(brief.items.map((i) => i.sourceId)).toEqual(expect.arrayContaining(['M:service-recovery', 'M:apology-structure', 'M:incident-comms']))
  })

  it('model failure still returns the seed items', async () => {
    const client = scripted([new Error('500')])
    const { d } = deps({ client })
    const brief = await runResearch(d, match, [])
    expect(brief.items.length).toBeGreaterThan(0)
    expect(brief.notFound.join(' ')).toMatch(/paper search/i)
  })

  it('stops at the 75 s deadline with seed items and a notFound line', async () => {
    let t = 0
    const client = scripted(Array.from({ length: 8 }, () => toolCall('search_papers', { query: 'x' })))
    const wrapped = { chat: { completions: { create: async (req: any, o: any) => { t += 40_000; return client.chat.completions.create(req, o) } } } }
    const { d } = deps({ client: wrapped, now: () => t })
    const brief = await runResearch(d, match, [])
    expect(client.calls.length).toBeLessThanOrEqual(2)
    expect(brief.notFound).toContain('Paper search ran out of time')
    expect(brief.items.some((i) => i.sourceId === 'M:incident-comms')).toBe(true)
  })

  it('seeds are emitted before the first model call', async () => {
    const seen: number[] = []
    const events: ResearchEvent[] = []
    const client = scripted([toolCall('submit_brief', { items: [], notFound: [] })])
    const spy = { chat: { completions: { create: async (req: any, o: any) => { seen.push(events.filter((e) => e.type === 'verified').length); return client.chat.completions.create(req, o) } } } }
    await runResearch({ client: spy, searchPapers: async () => [], doiResolves: async () => true, emit: (e) => events.push(e) }, match, [])
    expect(seen[0]).toBeGreaterThanOrEqual(3)
  })

  it('at most 6 search_papers calls reach searchPapers', async () => {
    const client = scripted(Array.from({ length: 8 }, (_, i) => toolCall('search_papers', { query: `q${i}` })))
    const { d, searches } = deps({ client })
    await runResearch(d, match, [])
    expect(searches()).toBe(6)
  })

  it('unused candidates are marked as not used', async () => {
    const client = scripted([toolCall('search_papers', { query: 'x' }), toolCall('submit_brief', { items: [], notFound: [] })])
    const { d, events } = deps({ client })
    await runResearch(d, match, [])
    expect(events).toContainEqual(expect.objectContaining({ type: 'dropped', sourceId: 'P:10.1/real', reason: expect.stringMatching(/not used/i) }))
  })
})
