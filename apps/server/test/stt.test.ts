import { EventEmitter } from 'node:events'
import { describe, expect, it, vi } from 'vitest'
import { bridgeStt, type SocketLike } from '../src/stt'

class FakeSocket extends EventEmitter implements SocketLike {
  sent: (string | Buffer)[] = []
  closed = false
  send(data: string | Buffer) { this.sent.push(data) }
  close() { if (!this.closed) { this.closed = true; this.emit('close', 1000) } }
  texts() { return this.sent.filter((x): x is string => typeof x === 'string').map((x) => JSON.parse(x)) }
}

function setup(opts: { language: 'en' | 'vi' | 'ja'; keywords: string[] } = { language: 'en', keywords: ['Tanaka', 'warehouse'] }) {
  const browser = new FakeSocket()
  const upstream = new FakeSocket()
  bridgeStt(browser, () => upstream, 'secret-key', opts)
  return { browser, upstream }
}

const handshakeOk = (u: FakeSocket) => u.emit('message', Buffer.from(JSON.stringify({ sessionId: 's1' })), false)
const event = (u: FakeSocket, e: object) => u.emit('message', Buffer.from(JSON.stringify(e)), false)

describe('bridgeStt', () => {
  it('first upstream frame is the auth handshake in PUSH_TO_TALK mode', () => {
    const { upstream } = setup()
    upstream.emit('open')
    expect(upstream.texts()[0]).toEqual({
      authorization: { accessToken: 'Bearer secret-key' },
      audioEncoding: 'PCM_24KHZ',
      model: 'muse-voice-transcribe-1.0',
      mode: 'PUSH_TO_TALK',
      languageBias: ['English'],
      keywords: ['Tanaka', 'warehouse'],
    })
  })

  it('languageBias follows the programme language', () => {
    const { upstream } = setup({ language: 'vi', keywords: [] })
    upstream.emit('open')
    expect(upstream.texts()[0].languageBias).toEqual(['Vietnamese'])
  })

  it('keywords come from the programme, at most 30', () => {
    const many = Array.from({ length: 40 }, (_, i) => `term${i}`)
    const { upstream } = setup({ language: 'ja', keywords: many })
    upstream.emit('open')
    expect(upstream.texts()[0].languageBias).toEqual(['Japanese'])
    expect(upstream.texts()[0].keywords).toEqual(many.slice(0, 30))
  })

  it('never sends the api key to the browser', () => {
    const { browser, upstream } = setup()
    upstream.emit('open')
    handshakeOk(upstream)
    event(upstream, { type: 'transcript', transcript: 'put a cache', final: false })
    expect(JSON.stringify(browser.sent)).not.toContain('secret-key')
  })

  it('audio sent before the handshake is held, then forwarded in order', () => {
    const { browser, upstream } = setup()
    browser.emit('message', Buffer.from([1, 2]), true)
    upstream.emit('open')
    browser.emit('message', Buffer.from([3, 4]), true)
    expect(upstream.sent.filter(Buffer.isBuffer)).toHaveLength(0)
    handshakeOk(upstream)
    expect(upstream.sent.filter(Buffer.isBuffer)).toEqual([Buffer.from([1, 2]), Buffer.from([3, 4])])
  })

  it('relays partial and final transcripts, and endStream on release', () => {
    const { browser, upstream } = setup()
    upstream.emit('open')
    handshakeOk(upstream)
    event(upstream, { type: 'transcript', transcript: 'put a', final: false })
    browser.emit('message', Buffer.from(JSON.stringify({ type: 'end' })), false)
    expect(upstream.texts().at(-1)).toEqual({ type: 'endStream' })
    event(upstream, { type: 'transcript', transcript: 'Put a cache in front.', final: true })
    expect(browser.texts()).toEqual([
      { type: 'partial', text: 'put a' },
      { type: 'final', text: 'Put a cache in front.' },
    ])
  })

  it('an upstream close mid-utterance still gives the browser a final with the partial text', () => {
    const { browser, upstream } = setup()
    upstream.emit('open')
    handshakeOk(upstream)
    event(upstream, { type: 'transcript', transcript: 'cache in front', final: false })
    upstream.close()
    expect(browser.texts().at(-1)).toEqual({ type: 'final', text: 'cache in front' })
    expect(browser.closed).toBe(true)
  })

  it('an upstream error becomes a browser error without details', () => {
    const { browser, upstream } = setup()
    upstream.emit('open')
    event(upstream, { type: 'error', message: 'invalid key secret-key' })
    expect(browser.texts().at(-1)).toEqual({ type: 'error' })
  })

  it('closing the browser closes upstream', () => {
    const { browser, upstream } = setup()
    browser.close()
    expect(upstream.closed).toBe(true)
  })

  it('an utterance longer than 60 seconds is ended and closed', () => {
    vi.useFakeTimers()
    try {
      const { browser, upstream } = setup()
      upstream.emit('open')
      handshakeOk(upstream)
      vi.advanceTimersByTime(60_001)
      expect(upstream.texts().at(-1)).toEqual({ type: 'endStream' })
      vi.advanceTimersByTime(5_001)
      expect(upstream.closed).toBe(true)
      expect(browser.closed).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })

  it('audio held before the handshake is capped at 5 seconds', () => {
    const { browser, upstream } = setup()
    for (let i = 0; i < 100; i++) browser.emit('message', Buffer.alloc(3840), true) // 100 x 80 ms = 8 s
    upstream.emit('open')
    handshakeOk(upstream)
    const bytes = upstream.sent.filter(Buffer.isBuffer).reduce((n, b) => n + b.length, 0)
    expect(bytes).toBeLessThanOrEqual(5 * 48000)
  })
})
