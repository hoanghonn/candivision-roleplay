import { EventEmitter } from 'node:events'
import { describe, expect, it } from 'vitest'
import { buildApp, type Deps } from '../src/app'
import { VisitorLimits } from '../src/limits'
import { LIBRARY, openStore } from '../src/store'
import type { SocketLike } from '../src/stt'
import { Budget } from '../src/usage'
import { outageBrief, outageProgramme as withExcerpts } from '../../../packages/core/test/fixtures/outage'
import { scripted } from './helpers'

const outageProgramme = { ...withExcerpts, skills: withExcerpts.skills.map((s) => ({ ...s, excerpts: [] })) }
const A = 'aaaaaaaa-0000-0000-0000-000000000001'
const B = 'bbbbbbbb-0000-0000-0000-000000000002'
const mp3 = new Uint8Array([0x49, 0x44, 0x33])
const reply = JSON.stringify({ say: 'When will it be fixed?', mood: 70, reveal: [], hangUp: false })

class FakeUpstream extends EventEmitter implements SocketLike {
  send() {}
  close() { this.emit('close', 1000) }
}

function setup(over: Partial<Deps> = {}, replies: any[] = []) {
  const store = openStore(':memory:')
  const spoken: string[] = []
  let upstreams = 0
  const app = buildApp({
    store, dailyUsd: 10, meta: scripted(replies), open: null, searchPapers: async () => [], doiResolves: async () => true,
    tts: { apiKey: 'k', fetch: (async (_u: string, init: any) => { spoken.push(JSON.parse(init.body).text); return new Response(mp3) }) as typeof fetch },
    stt: { apiKey: 'k', connect: () => { upstreams++; return new FakeUpstream() } },
    ...over,
  })
  const lib = store.createProgramme(LIBRARY, { text: 'x', fileIds: [] })
  store.saveProgramme(LIBRARY, lib, { programme: outageProgramme, brief: outageBrief })
  const library = store.publish(LIBRARY, lib)
  const own = store.createProgramme(A, { text: 'x', fileIds: [] })
  store.saveProgramme(A, own, { programme: outageProgramme, brief: outageBrief })
  const mine = store.publish(A, own)
  return { app, store, spoken, upstreams: () => upstreams, library: library.versionId, mine: mine.versionId }
}

const startCall = (app: any, ws: string, versionId: string, ip = '203.0.113.1') =>
  app.inject({ method: 'POST', url: '/api/calls', headers: { 'x-visitor-id': ws, 'x-forwarded-for': ip }, payload: { versionId, learner: 'Linh', level: 'L1', mode: 'full' } })

describe('text to speech is bound to a call', () => {
  it('speaks only a line the character said in my call', async () => {
    const { app, spoken, library } = setup()
    const { callId } = (await startCall(app, A, library)).json()
    const res = await app.inject({ method: 'POST', url: '/api/tts', headers: { 'x-visitor-id': A }, payload: { callId, turn: 0 } })
    expect(res.statusCode).toBe(200)
    expect(spoken).toEqual([outageProgramme.levels[0].opening])
  })

  it('free text is not accepted', async () => {
    const { app, spoken } = setup()
    const res = await app.inject({ method: 'POST', url: '/api/tts', headers: { 'x-visitor-id': A }, payload: { voice: 'man', text: 'Anything I like' } })
    expect(res.statusCode).toBe(400)
    expect(spoken).toEqual([])
  })

  it("another visitor's call and a learner turn are refused", async () => {
    const { app, library } = setup({}, [reply])
    const { callId } = (await startCall(app, A, library)).json()
    await app.inject({ method: 'POST', url: `/api/calls/${callId}/turn`, headers: { 'x-visitor-id': A }, payload: { text: 'Sorry.' } })
    expect((await app.inject({ method: 'POST', url: '/api/tts', headers: { 'x-visitor-id': B }, payload: { callId, turn: 0 } })).statusCode).toBe(404)
    expect((await app.inject({ method: 'POST', url: '/api/tts', headers: { 'x-visitor-id': A }, payload: { callId, turn: 1 } })).statusCode).toBe(400)
  })

  it('each line is spoken at most twice', async () => {
    const { app, library } = setup()
    const { callId } = (await startCall(app, A, library)).json()
    const say = () => app.inject({ method: 'POST', url: '/api/tts', headers: { 'x-visitor-id': A }, payload: { callId, turn: 0 } })
    expect((await say()).statusCode).toBe(200)
    expect((await say()).statusCode).toBe(200)
    expect((await say()).statusCode).toBe(429)
  })
})

describe('a turn reports where the reply sits', () => {
  it('returns the index of the character turn', async () => {
    const { app, library } = setup({}, [reply])
    const { callId } = (await startCall(app, A, library)).json()
    const r = (await app.inject({ method: 'POST', url: `/api/calls/${callId}/turn`, headers: { 'x-visitor-id': A }, payload: { text: 'Sorry.' } })).json()
    expect(r.turn).toBe(2)
  })
})

describe('two turns at once', () => {
  it('the second is refused while the first is being answered', async () => {
    let release!: () => void
    const slow = { chat: { completions: { create: () => new Promise((r) => { release = () => r({ choices: [{ message: { content: reply } }] }) }) } } }
    const { app, library } = setup({ meta: slow })
    const { callId } = (await startCall(app, A, library)).json()
    const first = app.inject({ method: 'POST', url: `/api/calls/${callId}/turn`, headers: { 'x-visitor-id': A }, payload: { text: 'one' } })
    await new Promise((r) => setTimeout(r, 10))
    const second = await app.inject({ method: 'POST', url: `/api/calls/${callId}/turn`, headers: { 'x-visitor-id': A }, payload: { text: 'two' } })
    expect(second.statusCode).toBe(409)
    expect(second.json().error).toBe('busy')
    release()
    expect((await first).statusCode).toBe(200)
  })
})

describe('budget modes', () => {
  it("at 80% spend only ready-built programmes take calls", async () => {
    const budget = new Budget({ dailyUsd: 10 })
    budget.add(8.5)
    const { app, library, mine } = setup({ budget })
    expect((await startCall(app, A, mine)).statusCode).toBe(503)
    expect((await startCall(app, A, library)).statusCode).toBe(200)
  })
})

describe('per-IP limits', () => {
  it('new visitor ids from one address still hit the address limit', async () => {
    const { app, library } = setup({ limits: new VisitorLimits({ programmes: 3, edits: 10, calls: 10, speech: 5 }), ipLimits: new VisitorLimits({ programmes: 6, edits: 20, calls: 2, speech: 10 }) })
    expect((await startCall(app, 'cccccccc-0001', library)).statusCode).toBe(200)
    expect((await startCall(app, 'cccccccc-0002', library)).statusCode).toBe(200)
    expect((await startCall(app, 'cccccccc-0003', library)).statusCode).toBe(429)
    expect((await startCall(app, 'cccccccc-0004', library, '198.51.100.7')).statusCode).toBe(200)
  })

  it('the client address is the last entry the proxy appended', async () => {
    const { app, library } = setup({ ipLimits: new VisitorLimits({ programmes: 6, edits: 20, calls: 1, speech: 10 }) })
    expect((await startCall(app, 'cccccccc-0001', library, 'spoofed, 203.0.113.9')).statusCode).toBe(200)
    expect((await startCall(app, 'cccccccc-0002', library, 'other-spoof, 203.0.113.9')).statusCode).toBe(429)
  })
})

describe('speech recognition needs a live call or the request-screen allowance', () => {
  it('request-screen speech is capped per visitor', async () => {
    const { app, upstreams } = setup({ limits: new VisitorLimits({ programmes: 3, edits: 10, calls: 10, speech: 1 }) })
    const open = async () => {
      const ws = await (app as any).injectWS(`/ws/stt?v=${A}&lang=en`)
      await new Promise((r) => setTimeout(r, 10))
      ws.terminate()
    }
    await app.ready()
    await open()
    await open()
    expect(upstreams()).toBe(1)
  })

  it('an ended call cannot open speech recognition', async () => {
    const { app, store, library, upstreams } = setup()
    const { callId } = (await startCall(app, A, library)).json()
    store.saveCall(A, callId, { ended: 1 })
    await app.ready()
    const ws = await (app as any).injectWS(`/ws/stt?v=${A}&callId=${callId}`)
    await new Promise((r) => setTimeout(r, 10))
    ws.terminate()
    expect(upstreams()).toBe(0)
  })
})
