import { combine, LineResultSchema, type Programme, type Reading, type Turn, type Verdict } from '@roleplay/core'
import { z } from 'zod'
import { chatJson, LlmError, MUSE, OPEN_JUDGE, type ChatClient } from './llm'
import { transcriptHash, type Store } from './store'

const ReadingsSchema = z.object({
  readings: z.array(z.object({ lineId: z.string(), result: LineResultSchema, turn: z.number().int().nullable().catch(null), quote: z.string().catch('') })),
})

const INTRO = {
  a: 'You are an independent judge of a training role-play. For each rubric line, decide from the transcript alone whether the learner did it.',
  b: 'You review a recorded practice call. Check the learner against each listed behaviour, using only what the transcript shows.',
}

function prompt(programme: Programme, variant: 'a' | 'b'): string {
  const lines = variant === 'a' ? programme.rubric : [...programme.rubric].reverse()
  return `${INTRO[variant]}
The learner plays: ${programme.learnerRole}. The other person is ${programme.persona.name}, ${programme.persona.role}.
Rubric lines:
${lines.map((r) => `[${r.id}] ${r.text} (listen for: ${r.lookFor})`).join('\n')}
For each line answer "pass" (clearly done), "partly" (attempted but incomplete or late) or "missed" (not done).
For pass or partly, give the turn number and quote the learner's exact words from that turn. Never quote ${programme.persona.name}. For missed, use turn null and quote "".
Judge behaviour, not the person. Do not reward intent that was not said.
Reply ONLY with JSON: {"readings": [{"lineId": "<id>", "result": "pass" | "partly" | "missed", "turn": <number or null>, "quote": "<exact words>"}]}`
}

const numbered = (turns: Turn[], name: string) => turns.map((t, i) => `[${i}] ${t.speaker === 'learner' ? 'Learner' : name}: ${t.text}`).join('\n')

export async function judgeCall(client: ChatClient, model: string, input: { programme: Programme; turns: Turn[]; variant: 'a' | 'b' }): Promise<Reading[] | null> {
  try {
    const out = await chatJson(client, {
      model,
      system: prompt(input.programme, input.variant),
      user: `Transcript:\n${numbered(input.turns, input.programme.persona.name)}`,
      schema: ReadingsSchema,
      effort: 'low',
      temperature: 0,
      timeoutMs: 45_000,
    })
    const known = new Set(input.programme.rubric.map((r) => r.id))
    return out.readings.filter((r) => known.has(r.lineId))
  } catch (e) {
    if (e instanceof LlmError) return null
    throw e
  }
}

const missedAll = (programme: Programme, judge2: Verdict['judge2']): Verdict[] =>
  programme.rubric.map((r) => {
    const reading: Reading = { lineId: r.id, result: 'missed', turn: null, quote: '' }
    return { lineId: r.id, result: 'missed', readings: [reading, reading], judge2, settled: null }
  })

/** Judge 1 is Muse Spark (Meta); judge 2 is Muse Spark Open (Baseten), or a second Muse Spark pass with the other prompt. */
export async function scoreCall(deps: { meta: ChatClient; open: ChatClient | null; store: Store }, version: { hash: string; programme: Programme }, turns: Turn[]): Promise<Verdict[]> {
  const { programme } = version
  if (!turns.some((t) => t.speaker === 'learner' && t.text.trim())) return missedAll(programme, deps.open ? 'baseten' : 'muse_fallback')
  const tHash = transcriptHash(turns)
  const cached = deps.store.cachedVerdicts(version.hash, tHash)
  if (cached) return cached
  const [a, b0] = await Promise.all([
    judgeCall(deps.meta, MUSE, { programme, turns, variant: 'a' }),
    deps.open ? judgeCall(deps.open, OPEN_JUDGE, { programme, turns, variant: 'b' }) : Promise.resolve(null),
  ])
  let b = b0
  let judge2: Verdict['judge2'] = 'baseten'
  if (!b) {
    judge2 = 'muse_fallback'
    b = await judgeCall(deps.meta, MUSE, { programme, turns, variant: 'b' })
  }
  const verdicts = combine(programme.rubric, turns, a, b, judge2)
  if (a && b) deps.store.cacheVerdicts(version.hash, tHash, verdicts)
  return verdicts
}
