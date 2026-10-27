import { CASES, plainDashes, ProgrammeSchema, validateProgramme, type CaseMatch, type FileText, type Problem, type Programme, type ResearchBrief } from '@roleplay/core'
import { z } from 'zod'
import { filesBlock } from './intake'
import { chatJson, LlmError, MUSE, type ChatClient } from './llm'

const SHAPE = `{
 "title": "<short programme title>",
 "caseId": "<case id>",
 "language": "en" | "vi" | "ja",
 "learnerRole": "<who practises>",
 "persona": {"name": "<a fictional first or family name that fits the setting>", "role": "<job title and company type>", "voice": "woman" | "man" | "older_man",
   "style": "<how they talk>", "facts": [{"id": "h1", "fact": "<something the character knows but does not say at first>", "earnedBy": "<what the learner must do to hear it>"}],
   "redLines": ["<what the character never does, e.g. never calms down before hearing a time for the next update>"],
   "portraitPrompt": "<a neutral description for an illustrated portrait, no real people, no text>"},
 "skills": [{"id": "s1", "name": "<skill>", "why": "<why it matters, one sentence>", "sources": ["<sourceId>"], "excerpts": [{"fileId": "<file id>", "quote": "<exact words from that file>"}]}],
 "levels": [{"id": "L1", "title": "<short>", "situation": "<what is different at this level>", "opening": "<the character's first line>", "moodStart": 0-100, "moodFloor": 0-100, "sources": [], "excerpts": []}],
 "rubric": [{"id": "r1", "skillId": "s1", "text": "<observable behaviour>", "mustHave": true|false, "lookFor": "<what a judge listens for>", "tryThis": "<a concrete line or move to try next time>", "sources": [], "excerpts": []}],
 "instructions": "<what the learner is told before the call, 2 sentences>",
 "keywords": ["<names and terms speech recognition must catch>"]
}`

const SYSTEM = `You build a voice role-play training programme from a research brief. Never guess: every skill, level and rubric line must cite
at least one sourceId from the brief, or quote the customer's own files word for word (excerpts with the file id and the exact words, at least 3 words).
Write in the conversation's language (titles, persona lines, rubric text). Mood is 0 (calm) to 100 (furious); moodFloor is the calmest the character can get at that level.
Make 2 or 3 levels that get harder in steps, as deliberate practice recommends. Write 4 to 8 rubric lines, each an observable behaviour; mark the ones the customer's "ready" depends on as mustHave.
Give the character 2 to 4 hidden facts the learner has to earn. Characters are fictional; never use real people or companies.
This is training, never assessment for hiring, firing or performance ratings.
Reply ONLY with JSON in this shape:
${SHAPE}`

function userPrompt(input: { match: CaseMatch; brief: ResearchBrief; files: FileText[] }): string {
  const t = CASES[input.match.caseId]
  return `Case: ${t.name} (caseId ${t.id}). Counterpart: ${t.counterpart}
Situation: ${input.match.situation}
Learner: ${input.match.learnerRole}. AI character: ${input.match.counterpartRole}. Language: ${input.match.language}.
What goes wrong today: ${input.match.stakes}
What "ready" means to the customer (wins over the case template): ${input.match.readyMeans.join('; ') || 'not stated'}
Case template "ready": ${t.readyLooksLike.join('; ') || 'none'}
Research brief items (cite these sourceIds):
${input.brief.items.map((i) => `- ${i.sourceId} [${i.use}]: ${i.gives}`).join('\n')}
Not found by research: ${input.brief.notFound.join('; ') || 'nothing'}
${filesBlock(input.files)}`
}

const asQuestions = (problems: Problem[]) => problems.map((p) => `${p.message} Can you add material or a source for it, or should we drop it?`)

export async function buildProgramme(
  client: ChatClient,
  input: { match: CaseMatch; brief: ResearchBrief; files: FileText[]; leadAnswers?: string },
): Promise<{ programme: Programme } | { questions: string[] }> {
  const user = input.leadAnswers
    ? `${userPrompt(input)}\n\nThe training lead answered earlier questions about this programme (follow these answers):\n${input.leadAnswers}`
    : userPrompt(input)
  let problems: Problem[] = []
  let previous = ''
  for (let attempt = 0; attempt < 2; attempt++) {
    let programme: Programme
    try {
      programme = await chatJson(client, {
        model: MUSE,
        system: SYSTEM,
        user: attempt === 0 ? user : `${user}\n\nYour previous programme:\n${previous}\n\nIt had these problems; fix every one and return the whole programme:\n${problems.map((p) => `- ${p.path}: ${p.message}`).join('\n')}`,
        schema: ProgrammeSchema.transform(plainDashes),
        effort: 'medium',
        timeoutMs: 90_000,
      })
    } catch (e) {
      if (e instanceof LlmError) return { questions: ['The programme could not be built from this request. Could you describe the conversation in a little more detail?'] }
      throw e
    }
    // The case match decides the language and the case; the model does not get to switch them.
    programme = { ...programme, language: input.match.language, caseId: input.match.caseId }
    problems = validateProgramme(programme, input.brief, input.files)
    if (problems.length === 0) return { programme }
    previous = JSON.stringify(programme)
  }
  return { questions: asQuestions(problems) }
}

const EditReply = z.object({ programme: ProgrammeSchema, changes: z.array(z.string()) }).transform(plainDashes)
export const MAX_INSTRUCTION = 500

export async function editProgramme(
  client: ChatClient,
  input: { programme: Programme; brief: ResearchBrief; files: FileText[]; instruction: string },
): Promise<{ programme: Programme; changes: string[] } | { problems: Problem[] }> {
  let reply: z.infer<typeof EditReply>
  try {
    reply = await chatJson(client, {
      model: MUSE,
      system: `${SYSTEM}\n\nYou are now editing an existing programme. Apply the training lead's instruction and change nothing else.
Keep the language the same unless the instruction asks for a different language. Keep every citation rule.
Reply ONLY with JSON: {"programme": <the whole programme>, "changes": ["<each change, one plain sentence>"]}`,
      user: `Current language: ${input.programme.language}\nCurrent programme:\n${JSON.stringify(input.programme)}\n\nResearch brief sourceIds: ${input.brief.items.map((i) => i.sourceId).join(', ')}\n${filesBlock(input.files)}\n\nInstruction from the training lead:\n${input.instruction.slice(0, MAX_INSTRUCTION)}`,
      schema: EditReply,
      effort: 'low',
      timeoutMs: 90_000,
    })
  } catch (e) {
    if (e instanceof LlmError) return { problems: [{ path: '', message: 'That change could not be applied. Try saying it another way.' }] }
    throw e
  }
  // An edit may change the language when asked, never the case.
  const edited = { ...reply, programme: { ...reply.programme, caseId: input.programme.caseId } }
  const problems = validateProgramme(edited.programme, input.brief, input.files)
  return problems.length ? { problems } : edited
}
