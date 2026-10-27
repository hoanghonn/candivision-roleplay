import type { Language } from '@roleplay/core'
import WebSocket from 'ws'

export const STT_URL = 'wss://api.meta.ai/v1/asr/realtime'
export const STT_MODEL = 'muse-voice-transcribe-1.0'
const LANGUAGE_BIAS: Record<Language, string> = { en: 'English', vi: 'Vietnamese', ja: 'Japanese' }
export const MAX_KEYWORDS = 30
/** One utterance is at most a minute; audio held before the handshake at most 5 seconds (24 kHz 16-bit mono). */
export const MAX_UTTERANCE_MS = 60_000
const MAX_PENDING_BYTES = 5 * 48000
const CLOSE_GRACE_MS = 5_000

export type SttOptions = { language: Language; keywords: string[] }

/** The parts of a `ws` WebSocket the bridge uses, so tests can pass fakes. */
export type SocketLike = {
  send(data: string | Buffer): void
  close(): void
  on(event: 'message', cb: (data: Buffer, isBinary: boolean) => void): unknown
  on(event: 'close', cb: (code: number) => void): unknown
  on(event: 'open', cb: () => void): unknown
  on(event: 'error', cb: (err: Error) => void): unknown
}

export const openUpstream = (): SocketLike => new WebSocket(`${STT_URL}?sessionId=roleplay-${crypto.randomUUID()}`) as unknown as SocketLike

/**
 * One push-to-talk utterance: browser audio -> Muse Voice Transcribe -> transcript events back to the browser,
 * in the programme's language with its own keywords.
 * The API key only ever travels on the upstream socket.
 */
export function bridgeStt(browser: SocketLike, connect: () => SocketLike, apiKey: string, opts: SttOptions): void {
  const upstream = connect()
  const pending: Buffer[] = []
  let ready = false
  let lastPartial = ''
  let finalSent = false
  let browserClosed = false
  let endRequested = false

  let pendingBytes = 0
  const finish = () => {
    endRequested = true
    if (ready) upstream.send(JSON.stringify({ type: 'endStream' }))
  }
  const longest = setTimeout(() => {
    finish()
    setTimeout(() => upstream.close(), CLOSE_GRACE_MS)
  }, MAX_UTTERANCE_MS)
  const toBrowser = (msg: object) => { if (!browserClosed) browser.send(JSON.stringify(msg)) }
  const sendFinal = (text: string) => {
    if (finalSent) return
    finalSent = true
    toBrowser({ type: 'final', text })
  }

  upstream.on('open', () => {
    upstream.send(JSON.stringify({ authorization: { accessToken: `Bearer ${apiKey}` }, audioEncoding: 'PCM_24KHZ', model: STT_MODEL, mode: 'PUSH_TO_TALK', languageBias: [LANGUAGE_BIAS[opts.language]], keywords: opts.keywords.slice(0, MAX_KEYWORDS) }))
  })

  upstream.on('message', (data, isBinary) => {
    if (isBinary) return
    let ev: any
    try { ev = JSON.parse(data.toString()) } catch { return }
    if (!ready && ev.sessionId) {
      ready = true
      for (const chunk of pending.splice(0)) upstream.send(chunk)
      if (endRequested) upstream.send(JSON.stringify({ type: 'endStream' }))
      return
    }
    if (ev.type === 'error') {
      finalSent = true // the error is the last word on this utterance
      toBrowser({ type: 'error' })
      upstream.close()
      return
    }
    if (ev.type === 'transcript' && typeof ev.transcript === 'string') {
      if (ev.final) sendFinal(ev.transcript.trim())
      else {
        lastPartial = ev.transcript
        toBrowser({ type: 'partial', text: ev.transcript })
      }
    }
  })

  upstream.on('close', () => {
    clearTimeout(longest)
    sendFinal(lastPartial.trim())
    if (!browserClosed) { browserClosed = true; browser.close() }
  })
  upstream.on('error', () => { toBrowser({ type: 'error' }) })

  browser.on('message', (data, isBinary) => {
    if (isBinary) {
      if (ready) upstream.send(data)
      else if (pendingBytes + data.length <= MAX_PENDING_BYTES) { pending.push(data); pendingBytes += data.length }
      return
    }
    let msg: any
    try { msg = JSON.parse(data.toString()) } catch { return }
    if (msg.type === 'end') finish()
  })
  browser.on('close', () => {
    browserClosed = true
    upstream.close()
  })
}
