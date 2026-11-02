import { describe, expect, it } from 'vitest'
import { createPlayer } from './player'

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((r) => (resolve = r))
  return { promise, resolve }
}

describe('voice player', () => {
  it('queues lines and never overlaps them', async () => {
    const log: string[] = []
    const ends: Record<string, ReturnType<typeof deferred>> = {}
    const player = createPlayer({
      playUrl: (src) => { log.push(`start ${src}`); ends[src] = deferred(); return ends[src].promise.then(() => { log.push(`end ${src}`) }) },
      fetchTts: async (item) => `blob:${item.text}`,
      speak: async () => {},
    })
    const a = player.say({ voice: 'man', text: 'one', lang: 'en', callId: 'c', turn: 0 })
    const b = player.say({ voice: 'man', text: 'two', lang: 'en', callId: 'c', turn: 2 })
    await new Promise((r) => setTimeout(r, 0))
    expect(log).toEqual(['start blob:one'])
    ends['blob:one'].resolve()
    await a
    await new Promise((r) => setTimeout(r, 0))
    ends['blob:two'].resolve()
    await b
    expect(log).toEqual(['start blob:one', 'end blob:one', 'start blob:two', 'end blob:two'])
  })

  it('falls back to the browser voice in the programme language', async () => {
    const spoken: string[] = []
    const player = createPlayer({ playUrl: async () => {}, fetchTts: async () => null, speak: async (t, lang) => { spoken.push(`${lang}:${t}`) } })
    await player.say({ voice: 'woman', text: 'Xin chào', lang: 'vi', callId: 'c', turn: 0 })
    expect(spoken).toEqual(['vi:Xin chào'])
  })

  it('a clip that fails is skipped and the queue goes on', async () => {
    const played: string[] = []
    const player = createPlayer({
      playUrl: async (src) => { if (src === 'blob:bad') throw new Error('x'); played.push(src) },
      fetchTts: async (item) => `blob:${item.text}`,
      speak: async () => {},
    })
    await player.say({ voice: 'man', text: 'bad', lang: 'en', callId: 'c', turn: 0 })
    await player.say({ voice: 'man', text: 'good', lang: 'en', callId: 'c', turn: 2 })
    expect(played).toEqual(['blob:good'])
  })
})
