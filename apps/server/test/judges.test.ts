import type { Turn } from '@roleplay/core'
import { describe, expect, it } from 'vitest'
import { judgeCall, scoreCall } from '../src/judges'
import { openStore } from '../src/store'
import { outageProgramme } from '../../../packages/core/test/fixtures/outage'
import { scripted } from './helpers'

const turns: Turn[] = [
  { speaker: 'persona', text: 'This is the second time this month.', atMs: 0, mood: 75 },
  { speaker: 'learner', text: 'I am sorry, this is on us. I will call you again at 3 pm with an update.', atMs: 5000, mood: null },
]
const readings = JSON.stringify({
  readings: [
    { lineId: 'r1', result: 'pass', turn: 1, quote: 'I am sorry, this is on us' },
    { lineId: 'r2', result: 'pass', turn: 1, quote: 'I will call you again at 3 pm' },
    { lineId: 'r3', result: 'missed', turn: null, quote: '' },
  ],
})
const version = { hash: 'abc123abc123', programme: outageProgramme }

describe('judgeCall', () => {
  it('judges run with temperature 0 and number the turns', async () => {
    const client = scripted([readings])
    const out = await judgeCall(client, 'm', { programme: outageProgramme, turns, variant: 'a' })
    expect(out).toHaveLength(3)
    expect(client.calls[0].temperature).toBe(0)
    expect(client.calls[0].messages[1].content).toContain('[1] Learner: I am sorry')
  })

  it('variant b lists the rubric in a different order', async () => {
    const a = scripted([readings])
    const b = scripted([readings])
    await judgeCall(a, 'm', { programme: outageProgramme, turns, variant: 'a' })
    await judgeCall(b, 'm', { programme: outageProgramme, turns, variant: 'b' })
    const order = (c: typeof a) => ['r1', 'r2', 'r3'].sort((x, y) => (c.calls[0].messages[0].content as string).indexOf(`[${x}]`) - (c.calls[0].messages[0].content as string).indexOf(`[${y}]`))
    expect(order(a)).toEqual(['r1', 'r2', 'r3'])
    expect(order(b)).toEqual(['r3', 'r2', 'r1'])
  })

  it('returns null when the model fails', async () => {
    expect(await judgeCall(scripted([new Error('x'), new Error('x')]), 'm', { programme: outageProgramme, turns, variant: 'a' })).toBeNull()
  })
})

describe('scoreCall', () => {
  it('no learner turns means all missed without model calls', async () => {
    const meta = scripted([])
    const v = await scoreCall({ meta, open: null, store: openStore(':memory:') }, version, [turns[0]])
    expect(v.map((x) => x.result)).toEqual(['missed', 'missed', 'missed'])
    expect(meta.calls).toHaveLength(0)
  })

  it('two agreeing judges pass the call lines', async () => {
    const meta = scripted([readings])
    const open = scripted([readings])
    const v = await scoreCall({ meta, open, store: openStore(':memory:') }, version, turns)
    expect(v.map((x) => x.result)).toEqual(['pass', 'pass', 'missed'])
    expect(v[0].judge2).toBe('baseten')
    expect(open.calls[0].model).toBe('meta-models/muse-spark-open-1026')
    expect(meta.calls[0].model).toBe('muse-spark-1.3')
  })

  it('same transcript twice uses the cache', async () => {
    const store = openStore(':memory:')
    const meta = scripted([readings])
    const open = scripted([readings])
    const first = await scoreCall({ meta, open, store }, version, turns)
    const second = await scoreCall({ meta, open, store }, version, turns)
    expect(second).toEqual(first)
    expect(meta.calls).toHaveLength(1)
    expect(open.calls).toHaveLength(1)
  })

  it('Baseten failure falls back to Muse variant b and labels it', async () => {
    const meta = scripted([readings, readings])
    const open = scripted([new Error('403'), new Error('403')])
    const v = await scoreCall({ meta, open, store: openStore(':memory:') }, version, turns)
    expect(v[0].judge2).toBe('muse_fallback')
    expect(meta.calls).toHaveLength(2)
    expect(v.map((x) => x.result)).toEqual(['pass', 'pass', 'missed'])
  })

  it('no Baseten client also falls back', async () => {
    const meta = scripted([readings, readings])
    const v = await scoreCall({ meta, open: null, store: openStore(':memory:') }, version, turns)
    expect(v[0].judge2).toBe('muse_fallback')
  })
})
