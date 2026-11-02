import { describe, expect, it, vi } from 'vitest'
import { PushToTalk, resampleTo24k, type PttState } from './pushToTalk'

describe('resampleTo24k', () => {
  it('48 kHz input halves the sample count and converts to 16-bit', () => {
    const input = new Float32Array(4800).fill(0.5)
    const out = resampleTo24k(input, 48000)
    expect(out).toBeInstanceOf(Int16Array)
    expect(out.length).toBe(2400)
    expect(out[100]).toBe(Math.round(0.5 * 32767))
  })

  it('clips values outside -1..1', () => {
    const out = resampleTo24k(new Float32Array([2, -2]), 24000)
    expect(Array.from(out)).toEqual([32767, -32768])
  })
})

class FakeSocket {
  sent: unknown[] = []
  onmessage: ((e: { data: string }) => void) | null = null
  onclose: (() => void) | null = null
  onopen: (() => void) | null = null
  readyState = 1
  binaryType = ''
  send(d: unknown) { this.sent.push(d) }
  close() { this.onclose?.() }
}

function make(getUserMedia: () => Promise<MediaStream>) {
  const states: PttState[] = []
  const finals: string[] = []
  const socket = new FakeSocket()
  const ptt = new PushToTalk({
    wsUrl: 'ws://x/ws/stt',
    onState: (s) => states.push(s),
    onPartial: () => {},
    onFinal: (t) => finals.push(t),
    getUserMedia,
    createSocket: () => socket as unknown as WebSocket,
    startCapture: async () => ({ stop: () => {} }),
  })
  return { ptt, states, finals, socket }
}

describe('PushToTalk', () => {
  it('microphone permission denied sets state no-mic', async () => {
    const { ptt, states } = make(() => Promise.reject(new DOMException('denied', 'NotAllowedError')))
    await ptt.start()
    expect(states.at(-1)).toBe('no-mic')
  })

  it('release sends end, and a final transcript is delivered', async () => {
    const { ptt, states, finals, socket } = make(() => Promise.resolve({} as MediaStream))
    await ptt.start()
    expect(states.at(-1)).toBe('listening')
    ptt.stop()
    expect(socket.sent.at(-1)).toBe(JSON.stringify({ type: 'end' }))
    expect(states.at(-1)).toBe('thinking')
    socket.onmessage?.({ data: JSON.stringify({ type: 'final', text: 'cache in front' }) })
    expect(finals).toEqual(['cache in front'])
  })

  it('an empty final is ignored and the state goes back to idle', async () => {
    const { ptt, states, finals, socket } = make(() => Promise.resolve({} as MediaStream))
    await ptt.start()
    ptt.stop()
    socket.onmessage?.({ data: JSON.stringify({ type: 'final', text: '   ' }) })
    expect(finals).toEqual([])
    expect(states.at(-1)).toBe('idle')
  })

  it('a server error sets state error', async () => {
    const { ptt, states, socket } = make(() => Promise.resolve({} as MediaStream))
    await ptt.start()
    socket.onmessage?.({ data: JSON.stringify({ type: 'error' }) })
    expect(states.at(-1)).toBe('error')
  })

  it('start while already listening does nothing', async () => {
    const gum = vi.fn(() => Promise.resolve({} as MediaStream))
    const { ptt } = make(gum)
    await ptt.start()
    await ptt.start()
    expect(gum).toHaveBeenCalledTimes(1)
  })

  it('a tap released before the microphone opens never starts streaming', async () => {
    let grant!: (s: MediaStream) => void
    const stopped: string[] = []
    const track = { stop: () => stopped.push('track') }
    const socket = new FakeSocket()
    let captures = 0
    let sockets = 0
    const ptt = new PushToTalk({
      wsUrl: 'ws://x/ws/stt',
      onState: () => {},
      onPartial: () => {},
      onFinal: () => {},
      getUserMedia: () => new Promise((r) => { grant = r }),
      createSocket: () => { sockets++; return socket as unknown as WebSocket },
      startCapture: async () => { captures++; return { stop: () => {} } },
    })
    const started = ptt.start()
    ptt.stop() // released while the permission prompt / mic is still opening
    grant({ getTracks: () => [track] } as unknown as MediaStream)
    await started
    expect(captures).toBe(0)
    expect(sockets).toBe(0)
    expect(stopped).toEqual(['track'])
  })

  it('a release while capture is starting stops the capture and ends the utterance', async () => {
    let release!: () => void
    const captureStops: string[] = []
    const socket = new FakeSocket()
    const states: PttState[] = []
    const ptt = new PushToTalk({
      wsUrl: 'ws://x/ws/stt',
      onState: (s) => states.push(s),
      onPartial: () => {},
      onFinal: () => {},
      getUserMedia: () => Promise.resolve({ getTracks: () => [] } as unknown as MediaStream),
      createSocket: () => socket as unknown as WebSocket,
      startCapture: () => new Promise((r) => { release = () => r({ stop: () => captureStops.push('capture') }) }),
    })
    const started = ptt.start()
    await new Promise((r) => setTimeout(r, 0))
    ptt.stop()
    release()
    await started
    expect(captureStops).toEqual(['capture'])
    expect(socket.sent.at(-1)).toBe(JSON.stringify({ type: 'end' }))
  })
})
