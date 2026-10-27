import { describe, expect, it } from 'vitest'
import { buildApp } from '../src/app'
import { openStore } from '../src/store'
import { VOICES } from '../src/voices'
import { scripted } from './helpers'

const mp3 = new Uint8Array([0x49, 0x44, 0x33, 1, 2, 3])
const V = 'aaaaaaaa-0000-0000-0000-000000000001'

function app(status = 200) {
  const calls: { url: string; body: any }[] = []
  const fetchImpl = (async (url: string, init: any) => {
    calls.push({ url, body: JSON.parse(init.body) })
    return new Response(status === 200 ? mp3 : 'nope', { status })
  }) as typeof fetch
  const a = buildApp({ store: openStore(':memory:'), dailyUsd: 10, meta: scripted([]), open: null, searchPapers: async () => [], doiResolves: async () => true, tts: { apiKey: 'el-key', fetch: fetchImpl } })
  return { app: a, calls }
}

describe('POST /api/tts', () => {
  it('returns mp3 audio for a persona voice', async () => {
    const { app: a, calls } = app()
    const res = await a.inject({ method: 'POST', url: '/api/tts', headers: { 'x-visitor-id': V }, payload: { voice: 'woman', text: 'Xin chào, chị là Hạnh.' } })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toBe('audio/mpeg')
    expect(calls[0].url).toContain(VOICES.woman.id)
    expect(calls[0].body).toEqual({ text: 'Xin chào, chị là Hạnh.', model_id: 'eleven_flash_v2_5' })
  })

  it('tts rejects text over 400 chars', async () => {
    const { app: a, calls } = app()
    const res = await a.inject({ method: 'POST', url: '/api/tts', headers: { 'x-visitor-id': V }, payload: { voice: 'man', text: 'x'.repeat(401) } })
    expect(res.statusCode).toBe(400)
    expect(calls).toHaveLength(0)
  })

  it('rejects an unknown voice', async () => {
    const { app: a } = app()
    const res = await a.inject({ method: 'POST', url: '/api/tts', headers: { 'x-visitor-id': V }, payload: { voice: 'robot', text: 'hi' } })
    expect(res.statusCode).toBe(400)
  })

  it('a provider 401 becomes 503 so the browser falls back to its own voice', async () => {
    const { app: a } = app(401)
    const res = await a.inject({ method: 'POST', url: '/api/tts', headers: { 'x-visitor-id': V }, payload: { voice: 'older_man', text: 'hi' } })
    expect(res.statusCode).toBe(503)
  })
})
