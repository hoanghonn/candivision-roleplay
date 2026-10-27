import { effective, gate } from './gate'
import type { Programme, Verdict } from './types'

export type CallSummary = { learner: string; created: number; mode: 'full' | 'drill'; verdicts: Verdict[]; sample: boolean }
type Count = { pass: number; of: number }
export type TeamReport = {
  learners: number
  passedFirstTry: number
  passedLatest: number
  waiting: number
  skills: { skillId: string; name: string; firstTry: Count; latest: Count }[]
  people: { learner: string; sample: boolean; status: 'passed' | 'not_yet' | 'waiting'; calls: number }[]
  hasSample: boolean
}

/**
 * Progress on one frozen version: each learner's first full call against their latest. Unsure lines are waiting,
 * not failures. People are listed alphabetically, never ranked.
 */
export function teamReport(programme: Programme, calls: CallSummary[]): TeamReport {
  const full = calls.filter((c) => c.mode === 'full').sort((a, b) => a.created - b.created)
  const byLearner = new Map<string, CallSummary[]>()
  for (const c of full) {
    const key = `${c.sample ? 's' : 'l'}:${c.learner}`
    byLearner.set(key, [...(byLearner.get(key) ?? []), c])
  }
  const groups = [...byLearner.values()]
  const first = groups.map((g) => g[0])
  const latest = groups.map((g) => g[g.length - 1])

  const skillLines = (skillId: string) => {
    const lines = programme.rubric.filter((r) => r.skillId === skillId)
    return lines.some((l) => l.mustHave) ? lines.filter((l) => l.mustHave) : lines
  }
  const count = (set: CallSummary[], skillId: string): Count => {
    const lines = skillLines(skillId)
    const out = { pass: 0, of: 0 }
    for (const c of set) {
      const results = lines.map((l) => { const v = c.verdicts.find((x) => x.lineId === l.id); return v ? effective(v) : 'unsure' })
      if (results.includes('unsure')) continue
      out.of++
      if (results.every((r) => r === 'pass')) out.pass++
    }
    return out
  }

  const people = groups
    .map((g) => {
      const last = g[g.length - 1]
      const { passed, waiting } = gate(programme.rubric, last.verdicts)
      const status: 'passed' | 'not_yet' | 'waiting' = passed ? 'passed' : waiting > 0 ? 'waiting' : 'not_yet'
      return { learner: last.learner, sample: last.sample, status, calls: g.length }
    })
    .sort((a, b) => Number(a.sample) - Number(b.sample) || a.learner.localeCompare(b.learner, undefined, { sensitivity: 'base' }))

  return {
    learners: groups.length,
    passedFirstTry: first.filter((c) => gate(programme.rubric, c.verdicts).passed).length,
    passedLatest: latest.filter((c) => gate(programme.rubric, c.verdicts).passed).length,
    waiting: people.filter((p) => p.status === 'waiting').length,
    skills: programme.skills.map((s) => ({ skillId: s.id, name: s.name, firstTry: count(first, s.id), latest: count(latest, s.id) })),
    people,
    hasSample: full.some((c) => c.sample),
  }
}
