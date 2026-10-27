import { describe, expect, it } from 'vitest'
import { buildApp, type Deps } from '../src/app'
import { LIBRARY, openStore } from '../src/store'
import { Budget } from '../src/usage'
import { outageBrief, outageProgramme as withExcerpts } from '../../../packages/core/test/fixtures/outage'
import { scripted } from './helpers'

const outageProgramme = { ...withExcerpts, skills: withExcerpts.skills.map((s) => ({ ...s, excerpts: [] })) }
const A = 'aaaaaaaa-0000-0000-0000-000000000001'
const B = 'bbbbbbbb-0000-0000-0000-000000000002'
const ok = (over: Record<string, unknown> = {}) => JSON.stringify({ say: 'When will it be fixed?', mood: 70, reveal: [], hangUp: false, ...over })

function setup(replies: any[] = [], over: Partial<Deps> = {}) {
  const store = openStore(':memory:')
  let t = 1_000_000
  const meta = scripted(replies)
  const app = buildApp({ store, dailyUsd: 10, meta, open: null, searchPapers: async () => [], doiResolves: async () => true, now: () => t, ...over })
  const pid = store.createProgramme(LIBRARY, { text: 'outage', fileIds: [] })
  store.saveProgramme(LIBRARY, pid, { programme: outageProgramme, brief: outageBrief })
  const { versionId } = store.publish(LIBRARY, pid)
  return { app, store, versionId, pid, meta, tick: (ms: number) => { t += ms } }
}

const start = (app: ReturnType<typeof buildApp>, ws: string, payload: Record<string, unknown>) =>
  app.inject({ method: 'POST', url: '/api/calls', headers: { 'x-visitor-id': ws }, payload })

describe('calls', () => {
  it('starts with the level opening and the persona card', async () => {
    const { app, versionId } = setup()
    const res = await start(app, A, { versionId, learner: 'Linh', level: 'L2', mode: 'full' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ opening: outageProgramme.levels[1].opening, mood: 75, persona: { name: 'Tanaka', voice: 'man' }, language: 'en', maxSeconds: 480 })
  })

  it('calls on a library version work for any visitor and are stored in the caller workspace', async () => {
    const { app, store, versionId } = setup()
    const { callId } = (await start(app, B, { versionId, learner: 'Minh', level: 'L1', mode: 'full' })).json()
    expect(store.call(B, callId)?.learner).toBe('Minh')
    expect(store.call(A, callId)).toBeNull()
  })

  it("another visitor's private version is 404", async () => {
    const { app, store } = setup()
    const pid = store.createProgramme(A, { text: 'x', fileIds: [] })
    store.saveProgramme(A, pid, { programme: outageProgramme, brief: outageBrief })
    const { versionId } = store.publish(A, pid)
    expect((await start(app, B, { versionId, learner: 'Minh', level: 'L1', mode: 'full' })).statusCode).toBe(404)
  })

  it('drill call has maxSeconds 60 and needs a real line', async () => {
    const { app, versionId } = setup()
    expect((await start(app, A, { versionId, learner: 'Linh', level: 'L1', mode: 'drill', drillLineId: 'r2' })).json().maxSeconds).toBe(60)
    expect((await start(app, A, { versionId, learner: 'Linh', level: 'L1', mode: 'drill', drillLineId: 'nope' })).statusCode).toBe(400)
  })

  it('a turn returns the reply, the mood and newly earned facts', async () => {
    const { app, versionId, tick } = setup([ok({ mood: 60, reveal: ['h1'] })])
    const { callId } = (await start(app, A, { versionId, learner: 'Linh', level: 'L2', mode: 'full' })).json()
    tick(5000)
    const res = await app.inject({ method: 'POST', url: `/api/calls/${callId}/turn`, headers: { 'x-visitor-id': A }, payload: { text: 'I am sorry, this is on us.' } })
    expect(res.json()).toEqual({ say: 'When will it be fixed?', mood: 60, revealed: [outageProgramme.persona.facts[0].fact], ended: false })
  })

  it('call ends after 20 learner turns', async () => {
    const { app, versionId, tick } = setup(Array.from({ length: 20 }, () => ok()))
    const { callId } = (await start(app, A, { versionId, learner: 'Linh', level: 'L1', mode: 'full' })).json()
    let last: any
    for (let i = 0; i < 20; i++) {
      tick(1000)
      last = (await app.inject({ method: 'POST', url: `/api/calls/${callId}/turn`, headers: { 'x-visitor-id': A }, payload: { text: `turn ${i}` } })).json()
    }
    expect(last.ended).toBe(true)
    const after = await app.inject({ method: 'POST', url: `/api/calls/${callId}/turn`, headers: { 'x-visitor-id': A }, payload: { text: 'one more' } })
    expect(after.statusCode).toBe(409)
  })

  it('a turn long after the time limit ends the call without a model call', async () => {
    const { app, versionId, tick, meta } = setup([])
    const { callId } = (await start(app, A, { versionId, learner: 'Linh', level: 'L1', mode: 'drill', drillLineId: 'r2' })).json()
    tick(90_000)
    const res = (await app.inject({ method: 'POST', url: `/api/calls/${callId}/turn`, headers: { 'x-visitor-id': A }, payload: { text: 'hello' } })).json()
    expect(res.ended).toBe(true)
    expect(meta.calls).toHaveLength(0)
  })

  it('read_only mode refuses new calls', async () => {
    const budget = new Budget({ dailyUsd: 10 })
    budget.add(10)
    const { app, versionId } = setup([], { budget })
    expect((await start(app, A, { versionId, learner: 'Linh', level: 'L1', mode: 'full' })).statusCode).toBe(503)
  })

  it('a learner name is required', async () => {
    const { app, versionId } = setup()
    expect((await start(app, A, { versionId, learner: '  ', level: 'L1', mode: 'full' })).statusCode).toBe(400)
  })
})

describe('POST /api/programmes/:id/test-call', () => {
  it('stores and returns the test call result', async () => {
    const learner = JSON.stringify({ say: 'It was a database problem.' })
    const replies = [...Array.from({ length: 4 }, () => [learner, ok()]).flat(), JSON.stringify({ inRole: true, softenedUnearned: false, notes: ['Stayed firm.'] })]
    const { app, store } = setup(replies)
    const pid = store.createProgramme(A, { text: 'x', fileIds: [] })
    store.saveProgramme(A, pid, { programme: outageProgramme, brief: outageBrief })
    const res = await app.inject({ method: 'POST', url: `/api/programmes/${pid}/test-call`, headers: { 'x-visitor-id': A } })
    expect(res.json()).toEqual({ ok: true, notes: ['Stayed firm.'] })
    expect(store.programme(A, pid)?.testCall).toEqual({ ok: true, notes: ['Stayed firm.'] })
  })
})

describe('ending a call', () => {
  const readings = JSON.stringify({ readings: [
    { lineId: 'r1', result: 'pass', turn: 1, quote: 'I am sorry, this is on us' },
    { lineId: 'r2', result: 'missed', turn: null, quote: '' },
    { lineId: 'r3', result: 'missed', turn: null, quote: '' },
  ] })
  const disagree = JSON.stringify({ readings: [
    { lineId: 'r1', result: 'pass', turn: 1, quote: 'I am sorry, this is on us' },
    { lineId: 'r2', result: 'partly', turn: 1, quote: 'I am sorry, this is on us' },
    { lineId: 'r3', result: 'missed', turn: null, quote: '' },
  ] })

  async function talkedCall(judgeA: string, judgeB: string) {
    const ctx = setup([ok(), judgeA, judgeB])
    const { callId } = (await start(ctx.app, A, { versionId: ctx.versionId, learner: 'Linh', level: 'L1', mode: 'full' })).json()
    ctx.tick(3000)
    await ctx.app.inject({ method: 'POST', url: `/api/calls/${callId}/turn`, headers: { 'x-visitor-id': A }, payload: { text: 'I am sorry, this is on us.' } })
    return { ...ctx, callId }
  }

  it('end scores the call and returns the debrief, and is idempotent', async () => {
    const { app, callId, meta } = await talkedCall(readings, readings)
    const first = await app.inject({ method: 'POST', url: `/api/calls/${callId}/end`, headers: { 'x-visitor-id': A } })
    expect(first.json()).toMatchObject({ passed: false, drill: { lineId: 'r2' }, judge2: 'muse_fallback' })
    const again = await app.inject({ method: 'POST', url: `/api/calls/${callId}/end`, headers: { 'x-visitor-id': A } })
    expect(again.json()).toEqual(first.json())
    expect(meta.calls).toHaveLength(3)
    const got = (await app.inject({ method: 'GET', url: `/api/calls/${callId}`, headers: { 'x-visitor-id': A } })).json()
    expect(got).toMatchObject({ learner: 'Linh', level: 'L1', debrief: { passed: false } })
    expect(got.turns).toHaveLength(3)
  })

  it('settle turns an unsure line into the lead decision', async () => {
    const { app, callId } = await talkedCall(readings, disagree)
    const d = (await app.inject({ method: 'POST', url: `/api/calls/${callId}/end`, headers: { 'x-visitor-id': A } })).json()
    expect(d.lines.find((l: any) => l.lineId === 'r2').result).toBe('unsure')
    const settled = (await app.inject({ method: 'POST', url: `/api/calls/${callId}/settle`, headers: { 'x-visitor-id': A }, payload: { lineId: 'r2', result: 'pass' } })).json()
    expect(settled.lines.find((l: any) => l.lineId === 'r2').result).toBe('pass')
    expect(settled.passed).toBe(true)
  })

  it('settle on a line that is not unsure is refused', async () => {
    const { app, callId } = await talkedCall(readings, readings)
    await app.inject({ method: 'POST', url: `/api/calls/${callId}/end`, headers: { 'x-visitor-id': A } })
    const res = await app.inject({ method: 'POST', url: `/api/calls/${callId}/settle`, headers: { 'x-visitor-id': A }, payload: { lineId: 'r1', result: 'missed' } })
    expect(res.statusCode).toBe(409)
  })

  it("another visitor cannot read or end someone's call", async () => {
    const { app, callId } = await talkedCall(readings, readings)
    expect((await app.inject({ method: 'GET', url: `/api/calls/${callId}`, headers: { 'x-visitor-id': B } })).statusCode).toBe(404)
    expect((await app.inject({ method: 'POST', url: `/api/calls/${callId}/end`, headers: { 'x-visitor-id': B } })).statusCode).toBe(404)
  })
})
