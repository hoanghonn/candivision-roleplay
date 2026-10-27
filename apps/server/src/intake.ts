import { CASE_IDS, CASES, CaseMatchSchema, DeclinedSchema, LanguageSchema, type CaseMatch, type Declined, type FileText } from '@roleplay/core'
import { extractText as pdfText, getDocumentProxy } from 'unpdf'
import { z } from 'zod'
import { chatJson, MUSE, type ChatClient } from './llm'

// Customer files are read in memory and stored only in the visitor's workspace. Nothing here logs them.

export const MAX_FILE_BYTES = 2 * 1024 * 1024
export const MAX_FILE_CHARS = 30_000
const MIN_CHARS = 40
const TEXT_TYPES = ['.txt', '.md', '.eml']

export type IntakeError = 'unsupported' | 'no_text' | 'too_big'

export async function extractText(name: string, bytes: Buffer): Promise<{ text: string } | { error: IntakeError }> {
  if (bytes.length > MAX_FILE_BYTES) return { error: 'too_big' }
  const ext = name.toLowerCase().slice(name.lastIndexOf('.'))
  let text: string
  if (TEXT_TYPES.includes(ext)) text = bytes.toString('utf8')
  else if (ext === '.pdf') {
    try {
      const doc = await getDocumentProxy(new Uint8Array(bytes))
      text = (await pdfText(doc, { mergePages: true })).text
    } catch {
      return { error: 'no_text' }
    }
  } else return { error: 'unsupported' }
  text = text.replace(/\u0000/g, '').trim()
  if (text.length < MIN_CHARS) return { error: 'no_text' }
  return { text: text.slice(0, MAX_FILE_CHARS) }
}

/** Customer files for a prompt, each labelled with its id so excerpts can point back at it. */
export function filesBlock(files: FileText[], perFile = 8000): string {
  if (!files.length) return 'No customer files.'
  return files.map((f) => `<file id="${f.id}" name="${f.name}">\n${f.text.slice(0, perFile)}\n</file>`).join('\n')
}

const SYSTEM = `You read a training request from a company's training lead and classify it for a voice role-play training platform.
The platform trains employees in conversations. It never screens, ranks, scores or selects job candidates or employees for hiring, firing or performance ratings.
If the request is really about screening, ranking or selecting candidates or employees, reply ONLY with {"declined":"screening","reason":"<one plain sentence>"}.

Otherwise pick the closest case:
${CASE_IDS.map((id) => `- ${id}: ${CASES[id].name}. Counterpart: ${CASES[id].counterpart}`).join('\n')}
Use "generic" when none fits.

Reply ONLY with JSON:
{"caseId": "<case id>", "situation": "<the conversation to practise, one sentence>", "learnerRole": "<who practises>", "counterpartRole": "<who the AI character is>",
 "language": "en" | "vi" | "ja" (the language the conversation happens in; follow the request's language unless it says otherwise),
 "stakes": "<what goes wrong today, one sentence>", "readyMeans": ["<what the customer said ready looks like, in their words>"]}
Write every field in the conversation's language.`

const Reply = z.union([DeclinedSchema, CaseMatchSchema.extend({ caseId: z.string(), language: LanguageSchema.catch('en') })])

export async function matchCase(client: ChatClient, request: string, files: FileText[]): Promise<CaseMatch | Declined> {
  const reply = await chatJson(client, {
    model: MUSE,
    system: SYSTEM,
    user: `<request>\n${request}\n</request>\n${filesBlock(files, 3000)}`,
    schema: Reply,
    effort: 'low',
    timeoutMs: 30_000,
  })
  if ('declined' in reply) return reply
  const caseId = (CASE_IDS as readonly string[]).includes(reply.caseId) ? (reply.caseId as CaseMatch['caseId']) : 'generic'
  return { ...reply, caseId }
}
