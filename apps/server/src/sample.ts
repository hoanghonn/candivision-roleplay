import type { CallSummary, LineResult, Programme, Verdict } from '@roleplay/core'

/** A small seeded random generator, so the sample team is the same on every page load. */
function rng(seed: string) {
  let h = 2166136261
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

/**
 * Twelve made-up learners for the demo report on ready-built programmes, always labelled "sample" in the UI.
 * First tries pass each line about a third of the time, latest tries about four times in five.
 */
export function sampleTeam(programme: Programme, seed: string): CallSummary[] {
  const r = rng(seed)
  const verdicts = (pPass: number): Verdict[] =>
    programme.rubric.map((line) => {
      const x = r()
      const result: LineResult | 'unsure' = x < pPass ? 'pass' : x < pPass + 0.04 ? 'unsure' : x < pPass + 0.3 ? 'partly' : 'missed'
      return { lineId: line.id, result, readings: [null, null], judge2: 'baseten', settled: null }
    })
  const day = 24 * 3600 * 1000
  return Array.from({ length: 12 }, (_, i) => {
    const learner = `Learner ${String(i + 1).padStart(2, '0')}`
    return [
      { learner, created: i * 1000, mode: 'full' as const, verdicts: verdicts(0.35), sample: true },
      { learner, created: 7 * day + i * 1000, mode: 'full' as const, verdicts: verdicts(0.82), sample: true },
    ]
  }).flat()
}
