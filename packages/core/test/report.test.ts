import { describe, expect, it } from 'vitest'
import { teamReport, type CallSummary } from '../src/report'
import type { Verdict } from '../src/types'
import { outageProgramme } from './fixtures/outage'

// skills: s1 <- r1 (must), s2 <- r2 (must), r3 (nice)
const v = (r1: Verdict['result'], r2: Verdict['result'], r3: Verdict['result'] = 'missed'): Verdict[] =>
  [['r1', r1], ['r2', r2], ['r3', r3]].map(([lineId, result]) => ({ lineId: lineId as string, result: result as Verdict['result'], readings: [null, null], judge2: 'baseten', settled: null }))
const call = (learner: string, created: number, verdicts: Verdict[], mode: 'full' | 'drill' = 'full', sample = false): CallSummary => ({ learner, created, mode, verdicts, sample })

describe('teamReport', () => {
  it('first try vs latest per skill', () => {
    const r = teamReport(outageProgramme, [
      call('Linh', 1, v('pass', 'missed')),
      call('Linh', 5, v('pass', 'pass')),
      call('Minh', 2, v('missed', 'missed')),
      call('Minh', 6, v('pass', 'missed')),
    ])
    expect(r.learners).toBe(2)
    expect(r.passedFirstTry).toBe(0)
    expect(r.passedLatest).toBe(1)
    expect(r.skills).toEqual([
      { skillId: 's1', name: 'Own it and apologise', firstTry: { pass: 1, of: 2 }, latest: { pass: 2, of: 2 } },
      { skillId: 's2', name: 'Next update time', firstTry: { pass: 0, of: 2 }, latest: { pass: 1, of: 2 } },
    ])
  })

  it('drill calls do not count', () => {
    const r = teamReport(outageProgramme, [call('Linh', 1, v('pass', 'missed')), call('Linh', 2, v('pass', 'pass'), 'drill')])
    expect(r.passedLatest).toBe(0)
    expect(r.people[0].calls).toBe(1)
  })

  it('unsure lines are waiting, not failures', () => {
    const r = teamReport(outageProgramme, [call('Linh', 1, v('pass', 'unsure'))])
    expect(r.waiting).toBe(1)
    expect(r.skills[1].latest).toEqual({ pass: 0, of: 0 })
    expect(r.people[0].status).toBe('waiting')
  })

  it('learners are listed alphabetically, never by result', () => {
    const r = teamReport(outageProgramme, [call('Zoe', 1, v('pass', 'pass')), call('an', 2, v('missed', 'missed')), call('Bao', 3, v('pass', 'pass'))])
    expect(r.people.map((p) => p.learner)).toEqual(['an', 'Bao', 'Zoe'])
    expect(r.people.map((p) => p.status)).toEqual(['not_yet', 'passed', 'passed'])
  })

  it('flags a sample team and keeps sample and live learners apart', () => {
    const r = teamReport(outageProgramme, [call('Learner 01', 1, v('pass', 'pass'), 'full', true), call('Learner 01', 2, v('missed', 'missed'))])
    expect(r.hasSample).toBe(true)
    expect(r.learners).toBe(2)
    expect(r.people.map((p) => p.sample)).toEqual([false, true])
  })

  it('a settled line counts as settled', () => {
    const verdicts = v('pass', 'unsure').map((x) => (x.lineId === 'r2' ? { ...x, settled: 'pass' as const } : x))
    expect(teamReport(outageProgramme, [call('Linh', 1, verdicts)]).passedLatest).toBe(1)
  })
})
