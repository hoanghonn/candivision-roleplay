import type { ZodType } from 'zod'

/** The slice of the OpenAI SDK we use, so tests can pass a fake. */
export type ChatClient = { chat: { completions: { create: (req: any, opts?: any) => Promise<any> } } }

export const MUSE = 'muse-spark-1.3'
/** Muse Spark Open on Baseten. The bare 'meta-models/muse-spark-open' slug is refused with a misleading api-key error. */
export const OPEN_JUDGE = 'meta-models/muse-spark-open-1026'

export class LlmError extends Error {}

export type JsonRequest<T> = {
  model: string
  system: string
  user: string | any[]
  schema: ZodType<T>
  /** the Meta API refuses 'none' */
  effort?: 'minimal' | 'low' | 'medium'
  temperature?: number
  timeoutMs?: number
}

const firstObject = (raw: string) => raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)

/** One model call that must return JSON matching `schema`; one retry with the error, then LlmError. */
export async function chatJson<T>(client: ChatClient, req: JsonRequest<T>): Promise<T> {
  const messages: any[] = [
    { role: 'system', content: req.system },
    { role: 'user', content: req.user },
  ]
  let lastError = ''
  for (let attempt = 0; attempt < 2; attempt++) {
    let raw = ''
    try {
      const res = await client.chat.completions.create(
        { model: req.model, reasoning_effort: req.effort ?? 'low', ...(req.temperature !== undefined ? { temperature: req.temperature } : {}), messages },
        { timeout: req.timeoutMs ?? 60_000 },
      )
      raw = String(res?.choices?.[0]?.message?.content ?? '')
    } catch (e) {
      lastError = `model call failed: ${(e as Error).message}`
      continue
    }
    try {
      const parsed = req.schema.safeParse(JSON.parse(firstObject(raw)))
      if (parsed.success) return parsed.data
      lastError = parsed.error.message.slice(0, 1500)
    } catch {
      lastError = 'the reply was not valid JSON'
    }
    messages.push({ role: 'assistant', content: raw }, { role: 'user', content: `That reply was not usable (${lastError}). Reply again with ONLY the JSON object, matching the requested shape exactly.` })
  }
  throw new LlmError(lastError)
}
