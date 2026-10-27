import type { Programme, Turn } from '@roleplay/core'
import { z } from 'zod'
import { chatJson, LlmError, MUSE, type ChatClient } from './llm'
import { applyReply, personaTurn } from './persona'

const TURNS = 4

/** Before publishing: a model plays a weak learner against the hardest level, then a checker reads the transcript. */
export async function runTestCall(client: ChatClient, programme: Programme): Promise<{ ok: boolean; notes: string[] }> {
  const level = programme.levels.at(-1)!
  const turns: Turn[] = [{ speaker: 'persona', text: level.opening, atMs: 0, mood: level.moodStart }]
  let state = { mood: level.moodStart, revealed: [] as string[] }
  try {
    for (let i = 0; i < TURNS; i++) {
      const learner = await chatJson(client, {
        model: MUSE,
        system: `You play a weak, nervous ${programme.learnerRole} in a training role-play. Make the typical mistakes: over-explain, avoid responsibility, give no concrete next step. Speak ${programme.language}, one or two sentences. Reply ONLY with JSON: {"say": "<your words>"}`,
        user: turns.map((t) => `${t.speaker === 'persona' ? programme.persona.name : 'You'}: ${t.text}`).join('\n'),
        schema: z.object({ say: z.string().min(1) }),
        effort: 'minimal',
        timeoutMs: 15_000,
      })
      turns.push({ speaker: 'learner', text: learner.say, atMs: i * 10_000 + 5000, mood: null })
      const reply = await personaTurn(client, { programme, level, turns, revealed: state.revealed, mood: state.mood })
      const applied = applyReply(state, reply, level, programme.persona)
      state = { mood: applied.mood, revealed: applied.revealed }
      turns.push({ speaker: 'persona', text: applied.say, atMs: i * 10_000 + 9000, mood: applied.mood })
    }
    const check = await chatJson(client, {
      model: MUSE,
      system: `You check a training role-play character. The character card: ${JSON.stringify(programme.persona)}. Level: ${level.situation}
The learner in this test was deliberately weak. Answer: did the character stay in role the whole time (inRole), and did it calm down, give in or reveal hidden facts without the learner earning it (softenedUnearned)?
Reply ONLY with JSON: {"inRole": true|false, "softenedUnearned": true|false, "notes": ["<one short sentence each>"]}`,
      user: turns.map((t) => `${t.speaker === 'persona' ? programme.persona.name : 'Learner'}: ${t.text}`).join('\n'),
      schema: z.object({ inRole: z.boolean(), softenedUnearned: z.boolean(), notes: z.array(z.string()).catch([]) }),
      effort: 'low',
      timeoutMs: 30_000,
    })
    return { ok: check.inRole && !check.softenedUnearned, notes: check.notes.slice(0, 3) }
  } catch (e) {
    if (e instanceof LlmError) return { ok: false, notes: ['The test call could not run. Please try again.'] }
    throw e
  }
}
