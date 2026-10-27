import { describe, expect, it } from 'vitest'
import { buildDebrief } from '../src/debrief'
import type { Turn, Verdict } from '../src/types'
import { outageBrief, outageFiles, outageProgramme } from './fixtures/outage'

const turns: Turn[] = [
  { speaker: 'persona', text: 'What happened to our system?', atMs: 0, mood: 40 },
  { speaker: 'learner', text: 'I am sorry, this is on us. The database failed.', atMs: 21000, mood: null },
]
const files = outageFiles.map((f) => ({ id: f.id, name: f.name }))
const v = (lineId: string, result: Verdict['result'], turn: number | null = null, quote = ''): Verdict => ({
  lineId,
  result,
  readings: [result === 'unsure' ? null : { lineId, result: result === 'unsure' ? 'missed' : result, turn, quote }, result === 'unsure' ? { lineId, result: 'pass', turn, quote } : { lineId, result, turn, quote }],
  judge2: 'baseten',
  settled: null,
})

describe('buildDebrief', () => {
  it('drill targets the first failing must-have', () => {
    const d = buildDebrief(outageProgramme, outageBrief, files, turns, [v('r1', 'pass', 1, 'sorry, this is on us'), v('r2', 'missed'), v('r3', 'missed')])
    expect(d.passed).toBe(false)
    expect(d.drill).toMatchObject({ lineId: 'r2', seconds: 60, instruction: 'Replay just this part for 60 seconds: Say: I will call you again at 3 pm with an update.' })
  })

  it('no drill when everything passes', () => {
    const d = buildDebrief(outageProgramme, outageBrief, files, turns, [v('r1', 'pass', 1, 'sorry, this is on us'), v('r2', 'pass', 1, 'sorry, this is on us'), v('r3', 'pass', 1, 'sorry, this is on us')])
    expect(d.passed).toBe(true)
    expect(d.drill).toBeNull()
  })

  it('moment carries atMs of the quoted turn', () => {
    const d = buildDebrief(outageProgramme, outageBrief, files, turns, [v('r1', 'pass', 1, 'sorry, this is on us'), v('r2', 'missed'), v('r3', 'missed')])
    expect(d.lines.find((l) => l.lineId === 'r1')!.moment).toEqual({ turn: 1, atMs: 21000, quote: 'sorry, this is on us' })
    expect(d.lines.find((l) => l.lineId === 'r2')!.moment).toBeNull()
  })

  it('lines link to their research source', () => {
    const d = buildDebrief(outageProgramme, outageBrief, files, turns, [v('r1', 'pass', 1, 'sorry, this is on us'), v('r2', 'missed'), v('r3', 'missed')])
    expect(d.lines.find((l) => l.lineId === 'r2')!.source).toEqual({ title: 'PagerDuty Incident Response documentation', link: 'https://response.pagerduty.com/' })
  })

  it('customer-grounded line shows the file name and quote', () => {
    const p = { ...outageProgramme, rubric: outageProgramme.rubric.map((r) => (r.id === 'r2' ? { ...r, sources: [], excerpts: [{ fileId: 'f1', quote: 'nobody told us when it would be fixed' }] } : r)) }
    const d = buildDebrief(p, outageBrief, files, turns, [v('r1', 'pass', 1, 'sorry'), v('r2', 'missed'), v('r3', 'missed')])
    expect(d.lines.find((l) => l.lineId === 'r2')!.source).toEqual({ file: 'client-email-thread.txt', quote: 'nobody told us when it would be fixed' })
  })

  it('orders must-haves first, then missed, partly, unsure, pass', () => {
    const d = buildDebrief(outageProgramme, outageBrief, files, turns, [v('r1', 'pass', 1, 'sorry, this is on us'), v('r2', 'unsure', 1, 'x'), v('r3', 'missed')])
    expect(d.lines.map((l) => l.lineId)).toEqual(['r2', 'r1', 'r3'])
    expect(d.waiting).toBe(1)
  })
})
