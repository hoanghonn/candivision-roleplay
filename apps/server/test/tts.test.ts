import { describe, expect, it } from 'vitest'
import { buildApp } from '../src/app'
import { LIBRARY, openStore } from '../src/store'
import { synthesize } from '../src/tts'
import { VOICES } from '../src/voices'
import { outageBrief, outageProgramme as withExcerpts } from '../../../packages/core/test/fixtures/outage'
import { scripted } from './helpers'

const outageProgramme = { ...withExcerpts, skills: withExcerpts.skills.map((s) => ({ ...s, excerpts: [] })) }
const mp3 = new Uint8Array([0x49, 0x44, 0x33, 1, 2, 3])
const V = 'aaaaaaaa-0000-0000-0000-000000000001'

describe('synthesize', () => {
  it('asks ElevenLabs for the persona voice with the flash model', async () => {
    const calls: { url: string; body: any }[] = []
    const f = (async (url: string, init: any) => { calls.push({ url, body: JSON.parse(init.body) }); return new Response(mp3) }) as typeof fetch
    expect(await synthesize({ apiKey: 'k', fetch: f }, 'woman', 'Xin chào, chị là Hạnh.')).toEqual(mp3)
    expect(calls[0].url).toContain(VOICES.woman.id)
    expect(calls[0].body).toEqual({ text: 'Xin chào, chị là Hạnh.', model_id: 'eleven_flash_v2_5' })
  })
})

describe('POST /api/tts', () => {
  it('a provider 401 becomes 503 so the browser falls back to its own voice', async () => {
    const store = openStore(':memory:')
    const f = (async () => new Response('nope', { status: 401 })) as typeof fetch
    const app = buildApp({ store, dailyUsd: 10, meta: scripted([]), open: null, searchPapers: async () => [], doiResolves: async () => true, tts: { apiKey: 'k', fetch: f } })
    const pid = store.createProgramme(LIBRARY, { text: 'x', fileIds: [] })
    store.saveProgramme(LIBRARY, pid, { programme: outageProgramme, brief: outageBrief })
    const { versionId } = store.publish(LIBRARY, pid)
    const { callId } = (await app.inject({ method: 'POST', url: '/api/calls', headers: { 'x-visitor-id': V }, payload: { versionId, learner: 'Linh', level: 'L1', mode: 'full' } })).json()
    const res = await app.inject({ method: 'POST', url: '/api/tts', headers: { 'x-visitor-id': V }, payload: { callId, turn: 0 } })
    expect(res.statusCode).toBe(503)
  })
})
