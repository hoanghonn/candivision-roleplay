import { normalize, quoteIn } from './text'
import type { LineResult, Reading, RubricLine, Turn, Verdict } from './types'

/** A pass or partly must quote the learner's own words from the turn it names; a whole short turn may be quoted. */
function quoteOk(turns: Turn[], r: Reading): boolean {
  if (r.result === 'missed') return true
  const t = r.turn === null ? undefined : turns[r.turn]
  if (!t || t.speaker !== 'learner') return false
  if (quoteIn(t.text, r.quote)) return true
  const q = normalize(r.quote)
  return q.length > 0 && q === normalize(t.text)
}

/** Two independent readings per line: they agree, or the line is "unsure". Nothing is averaged away. */
export function combine(lines: RubricLine[], turns: Turn[], a: Reading[] | null, b: Reading[] | null, judge2: Verdict['judge2']): Verdict[] {
  const pick = (rs: Reading[] | null, lineId: string) => {
    const r = rs?.find((x) => x.lineId === lineId)
    return r && quoteOk(turns, r) ? r : null
  }
  return lines.map((line) => {
    const ra = pick(a, line.id)
    const rb = pick(b, line.id)
    const result = ra && rb && ra.result === rb.result ? ra.result : 'unsure'
    return { lineId: line.id, result, readings: [ra, rb], judge2, settled: null }
  })
}

export const effective = (v: Verdict): LineResult | 'unsure' => v.settled ?? v.result

/** Pass at the gate: every must-have line is "pass". Unsure must-haves wait for the training lead. */
export function gate(lines: RubricLine[], verdicts: Verdict[]): { passed: boolean; waiting: number } {
  const must = lines.filter((l) => l.mustHave)
  const of = (id: string) => verdicts.find((v) => v.lineId === id)
  const passed = must.every((l) => { const v = of(l.id); return !!v && effective(v) === 'pass' })
  const waiting = must.filter((l) => { const v = of(l.id); return !!v && effective(v) === 'unsure' }).length
  return { passed, waiting }
}

/** The training lead settles an unsure line with one of the two readings (or their own call). */
export function settle(verdicts: Verdict[], lineId: string, result: LineResult): Verdict[] {
  return verdicts.map((v) => (v.lineId === lineId ? { ...v, settled: result } : v))
}
