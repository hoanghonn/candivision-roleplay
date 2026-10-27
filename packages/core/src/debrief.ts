import { effective, gate } from './gate'
import type { LineResult, Programme, ResearchBrief, Turn, Verdict } from './types'

export type DebriefSource = { title: string; link: string } | { file: string; quote: string }
export type DebriefLine = {
  lineId: string
  text: string
  mustHave: boolean
  result: LineResult | 'unsure'
  moment: { turn: number; atMs: number; quote: string } | null
  readings: Verdict['readings']
  source: DebriefSource | null
  tryThis: string
}
export type Debrief = {
  passed: boolean
  waiting: number
  lines: DebriefLine[]
  drill: { lineId: string; text: string; instruction: string; seconds: 60; why: string } | null
  judge2: Verdict['judge2']
}

const RANK: Record<LineResult | 'unsure', number> = { missed: 0, partly: 1, unsure: 2, pass: 3 }

/** Deterministic: every line gets the moment, the rubric line, its source and one thing to try. No model call. */
export function buildDebrief(programme: Programme, brief: ResearchBrief, files: { id: string; name: string }[], turns: Turn[], verdicts: Verdict[]): Debrief {
  const lines: DebriefLine[] = programme.rubric.map((r) => {
    const v = verdicts.find((x) => x.lineId === r.id)
    const result = v ? effective(v) : 'unsure'
    const reading = v?.readings.find((x) => x && x.turn !== null && x.result !== 'missed') ?? null
    const turn = reading?.turn != null ? turns[reading.turn] : undefined
    const sourceId = r.sources.find((id) => brief.sources.some((s) => s.id === id))
    const s = sourceId ? brief.sources.find((x) => x.id === sourceId)! : null
    const ex = r.excerpts[0]
    const source: DebriefSource | null = s ? { title: s.title, link: s.link } : ex ? { file: files.find((f) => f.id === ex.fileId)?.name ?? 'Your file', quote: ex.quote } : null
    return {
      lineId: r.id,
      text: r.text,
      mustHave: r.mustHave,
      result,
      moment: reading && turn ? { turn: reading.turn!, atMs: turn.atMs, quote: reading.quote } : null,
      readings: v?.readings ?? [null, null],
      source,
      tryThis: r.tryThis,
    }
  })
  lines.sort((a, b) => Number(b.mustHave) - Number(a.mustHave) || RANK[a.result] - RANK[b.result])
  const { passed, waiting } = gate(programme.rubric, verdicts)
  const weak = programme.rubric.find((r) => r.mustHave && lines.find((l) => l.lineId === r.id)!.result !== 'pass')
  return {
    passed,
    waiting,
    lines,
    drill: weak
      ? { lineId: weak.id, text: weak.text, instruction: `Replay just this part for 60 seconds: ${weak.tryThis}`, seconds: 60, why: 'Short repeats on the weak part build the skill fastest (deliberate practice, Ericsson, Krampe and Tesch-Römer 1993).' }
      : null,
    judge2: verdicts[0]?.judge2 ?? 'baseten',
  }
}
