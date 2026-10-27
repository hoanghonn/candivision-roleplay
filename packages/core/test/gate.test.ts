import { describe, expect, it } from 'vitest'
import { combine, effective, gate, settle } from '../src/gate'
import type { Reading, Turn, Verdict } from '../src/types'
import { outageProgramme } from './fixtures/outage'

const lines = outageProgramme.rubric // r1 must, r2 must, r3 nice
const turns: Turn[] = [
  { speaker: 'persona', text: 'This is the second time this month.', atMs: 0, mood: 75 },
  { speaker: 'learner', text: 'I am sorry, this is on us. The database failed.', atMs: 5000, mood: null },
  { speaker: 'persona', text: 'When will it be fixed?', atMs: 9000, mood: 70 },
  { speaker: 'learner', text: 'Sorry.', atMs: 14000, mood: null },
]
const r = (lineId: string, result: Reading['result'], turn: number | null = null, quote = ''): Reading => ({ lineId, result, turn, quote })

describe('combine', () => {
  it('agreeing judges give the result', () => {
    const v = combine(lines, turns, [r('r1', 'pass', 1, 'sorry, this is on us')], [r('r1', 'pass', 1, 'I am sorry, this is on us')], 'baseten')
    expect(v.find((x) => x.lineId === 'r1')).toMatchObject({ result: 'pass', judge2: 'baseten', settled: null })
  })

  it('disagreeing judges give unsure with both readings', () => {
    const v = combine(lines, turns, [r('r1', 'pass', 1, 'sorry, this is on us')], [r('r1', 'partly', 1, 'sorry, this is on us')], 'baseten')
    const r1 = v.find((x) => x.lineId === 'r1')!
    expect(r1.result).toBe('unsure')
    expect(r1.readings.map((x) => x?.result)).toEqual(['pass', 'partly'])
  })

  it('a pass with a quote not in the transcript is discarded and becomes unsure', () => {
    const v = combine(lines, turns, [r('r2', 'pass', 1, 'I will call you at 3 pm')], [r('r2', 'pass', 1, 'I will call you at 3 pm')], 'baseten')
    const r2 = v.find((x) => x.lineId === 'r2')!
    expect(r2.result).toBe('unsure')
    expect(r2.readings).toEqual([null, null])
  })

  it('a pass may only quote the learner, not the character', () => {
    const v = combine(lines, turns, [r('r2', 'pass', 2, 'When will it be fixed?')], [r('r2', 'pass', 2, 'When will it be fixed?')], 'baseten')
    expect(v.find((x) => x.lineId === 'r2')!.result).toBe('unsure')
  })

  it('a short learner turn can be quoted whole', () => {
    const v = combine(lines, turns, [r('r1', 'partly', 3, 'Sorry.')], [r('r1', 'partly', 3, 'sorry')], 'baseten')
    expect(v.find((x) => x.lineId === 'r1')!.result).toBe('partly')
  })

  it('missed needs no quote, and a line a judge skipped is unsure', () => {
    const v = combine(lines, turns, [r('r3', 'missed'), r('r2', 'missed')], [r('r3', 'missed')], 'muse_fallback')
    expect(v.find((x) => x.lineId === 'r3')!.result).toBe('missed')
    expect(v.find((x) => x.lineId === 'r2')!.result).toBe('unsure')
    expect(v).toHaveLength(3)
  })

  it('a judge that failed entirely makes every line unsure', () => {
    const v = combine(lines, turns, [r('r3', 'missed')], null, 'muse_fallback')
    expect(v.every((x) => x.result === 'unsure')).toBe(true)
  })
})

describe('gate', () => {
  const verdict = (lineId: string, result: Verdict['result'], settled: Verdict['settled'] = null): Verdict => ({ lineId, result, readings: [null, null], judge2: 'baseten', settled })

  it('passes when every must-have passes', () => {
    expect(gate(lines, [verdict('r1', 'pass'), verdict('r2', 'pass'), verdict('r3', 'missed')])).toEqual({ passed: true, waiting: 0 })
  })

  it('nice-to-have misses do not block pass', () => {
    expect(gate(lines, [verdict('r1', 'pass'), verdict('r2', 'pass'), verdict('r3', 'unsure')]).passed).toBe(true)
  })

  it('unsure must-have blocks pass and counts as waiting', () => {
    expect(gate(lines, [verdict('r1', 'pass'), verdict('r2', 'unsure'), verdict('r3', 'pass')])).toEqual({ passed: false, waiting: 1 })
  })

  it('settled unsure counts', () => {
    const settledV = settle([verdict('r1', 'pass'), verdict('r2', 'unsure'), verdict('r3', 'pass')], 'r2', 'pass')
    expect(effective(settledV[1])).toBe('pass')
    expect(gate(lines, settledV)).toEqual({ passed: true, waiting: 0 })
  })

  it('a missing must-have verdict does not pass', () => {
    expect(gate(lines, [verdict('r1', 'pass')]).passed).toBe(false)
  })
})
