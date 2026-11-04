import { describe, expect, it } from 'vitest'
import { buildApp, type Deps } from '../src/app'
import { anon } from '../src/events'
import { LIBRARY, openStore } from '../src/store'
import { VisitorLimits } from '../src/limits'
import { outageBrief, outageProgramme as withExcerpts } from '../../../packages/core/test/fixtures/outage'
import { scripted } from './helpers'

const outageProgramme = { ...withExcerpts, skills: withExcerpts.skills.map((s) => ({ ...s, excerpts: [] })) }
const A = 'aaaaaaaa-0000-0000-0000-000000000001'
const reply = JSON.stringify({ say: 'When will it be fixed?', mood: 70, reveal: [], hangUp: false })

function setup(replies: any[] = [], over: Partial<Deps> = {}) {
  const store = openStore(':memory:')
  const events: { event: string; fields: Record<string, any> }[] = []
  const app = buildApp({ store, dailyUsd: 10, meta: scripted(replies), open: null, searchPapers: async () => [], doiResolves: async () => true, log: (event, fields = {}) => events.push({ event, fields }), ...over })
  const pid = store.createProgramme(LIBRARY, { text: 'outage', fileIds: [] })
  store.saveProgramme(LIBRARY, pid, { programme: outageProgramme, brief: outageBrief })
  const { versionId } = store.publish(LIBRARY, pid)
  const startCall = () => app.inject({ method: 'POST', url: '/api/calls', headers: { 'x-visitor-id': A }, payload: { versionId, learner: 'Linh Secret', level: 'L1', mode: 'full' } })
  return { app, store, events, startCall }
}
type Logged = { event: string; fields: Record<string, any> }
const named = (events: Logged[], name: string) => events.filter((e) => e.event === name)

describe('usage events', () => {
  it('a call start names the ready-built programme and level, never the learner or the raw visitor id', async () => {
    const { events, startCall } = setup()
    const { callId } = (await startCall()).json()
    const [e] = named(events, 'call_started')
    expect(e.fields).toMatchObject({ visitor: anon(A), callId, programme: outageProgramme.title, readyBuilt: true, language: 'en', level: 'L1', mode: 'full' })
    const text = JSON.stringify(events)
    expect(text).not.toContain('Linh Secret')
    expect(text).not.toContain(A)
  })

  it('the first scoring logs the outcome with turn count and judge completeness, and a rescore logs nothing', async () => {
    const judge = (r: string) => JSON.stringify({ readings: outageProgramme.rubric.map((l) => ({ lineId: l.id, result: r, turn: 1, quote: 'I am sorry' })) })
    const { app, events, startCall } = setup([reply, judge('pass'), judge('pass')])
    const { callId } = (await startCall()).json()
    await app.inject({ method: 'POST', url: `/api/calls/${callId}/turn`, headers: { 'x-visitor-id': A }, payload: { text: 'I am sorry about this.' } })
    await app.inject({ method: 'POST', url: `/api/calls/${callId}/end`, headers: { 'x-visitor-id': A } })
    await app.inject({ method: 'POST', url: `/api/calls/${callId}/end`, headers: { 'x-visitor-id': A } })
    const scored = named(events, 'call_scored')
    expect(scored).toHaveLength(1)
    expect(scored[0].fields).toMatchObject({ visitor: anon(A), callId, learnerTurns: 1, complete: true })
    expect(['passed', 'waiting', 'not_yet']).toContain(scored[0].fields.result)
  })

  it('a daily limit hit is logged with its kind', async () => {
    const { events, startCall } = setup([], { limits: new VisitorLimits({ programmes: 3, edits: 10, calls: 1, speech: 20 }) })
    await startCall()
    expect((await startCall()).statusCode).toBe(429)
    expect(named(events, 'limit_hit')[0].fields).toMatchObject({ visitor: anon(A), kind: 'call' })
  })

  it('a voice failure logs the provider status and reason', async () => {
    const f = (async () => new Response(JSON.stringify({ detail: { status: 'quota_exceeded', message: 'This request exceeds your quota of 10000.' } }), { status: 401 })) as typeof fetch
    const { app, events, startCall } = setup([], { tts: { apiKey: 'k', fetch: f } })
    const { callId } = (await startCall()).json()
    const res = await app.inject({ method: 'POST', url: '/api/tts', headers: { 'x-visitor-id': A }, payload: { callId, turn: 0 } })
    expect(res.statusCode).toBe(503)
    expect(named(events, 'tts_failed')[0].fields).toMatchObject({ callId, status: 401, reason: 'quota_exceeded', detail: 'This request exceeds your quota of 10000.' })
  })

  it('a voice request that cannot reach the provider is logged too', async () => {
    const f = (async () => { throw new Error('getaddrinfo ENOTFOUND') }) as unknown as typeof fetch
    const { app, events, startCall } = setup([], { tts: { apiKey: 'k', fetch: f } })
    const { callId } = (await startCall()).json()
    await app.inject({ method: 'POST', url: '/api/tts', headers: { 'x-visitor-id': A }, payload: { callId, turn: 0 } })
    expect(named(events, 'tts_failed')[0].fields).toMatchObject({ status: 0, reason: 'network', detail: 'getaddrinfo ENOTFOUND' })
  })

  it('a character reply the model could not give is logged, and the learner still gets the holding line', async () => {
    const { app, events, startCall } = setup([new Error('upstream 500'), new Error('upstream 500')])
    const { callId } = (await startCall()).json()
    const res = await app.inject({ method: 'POST', url: `/api/calls/${callId}/turn`, headers: { 'x-visitor-id': A }, payload: { text: 'hello' } })
    expect(res.statusCode).toBe(200)
    expect(named(events, 'persona_failed')[0].fields).toMatchObject({ callId })
  })

  it('an unexpected server error is logged with its route', async () => {
    const { app, store, events, startCall } = setup()
    const { callId } = (await startCall()).json()
    store.call = () => { throw new Error('database is locked') }
    const res = await app.inject({ method: 'GET', url: `/api/calls/${callId}`, headers: { 'x-visitor-id': A } })
    expect(res.statusCode).toBe(500)
    expect(named(events, 'server_error')[0].fields).toMatchObject({ route: '/api/calls/:id', method: 'GET', error: 'database is locked' })
  })
})

describe('anon', () => {
  it('is stable, short and not the id itself', () => {
    expect(anon(A)).toBe(anon(A))
    expect(anon(A)).toHaveLength(12)
    expect(anon(A)).not.toBe(anon('bbbbbbbb-0000-0000-0000-000000000002'))
  })
})
