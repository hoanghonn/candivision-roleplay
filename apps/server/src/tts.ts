import type { VoiceId } from '@roleplay/core'
import { VOICES } from './voices'

export const TTS_MODEL = 'eleven_flash_v2_5'
export const MAX_TTS_CHARS = 400

export type TtsDeps = { apiKey: string; fetch?: typeof fetch }
/** Why the provider refused: its HTTP status, and its own reason code and message when the body has them. */
export type TtsFailure = { status: number; reason: string; detail: string }

/** Returns MP3 bytes, or null when the provider refuses (the browser then uses its own voice); `onFail` hears why. */
export async function synthesize(deps: TtsDeps, voice: VoiceId, text: string, onFail?: (f: TtsFailure) => void): Promise<Uint8Array | null> {
  const f = deps.fetch ?? fetch
  const res = await f(`https://api.elevenlabs.io/v1/text-to-speech/${VOICES[voice].id}`, {
    method: 'POST',
    headers: { 'xi-api-key': deps.apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: TTS_MODEL }),
  })
  if (!res.ok) {
    onFail?.(await failure(res))
    return null
  }
  return new Uint8Array(await res.arrayBuffer())
}

/** ElevenLabs errors look like {"detail": {"status": "quota_exceeded", "message": "..."}}; anything else is kept as short text. */
async function failure(res: Response): Promise<TtsFailure> {
  const body = await res.text().catch(() => '')
  let detail: any = null
  try { detail = JSON.parse(body)?.detail } catch {}
  const reason = typeof detail?.status === 'string' ? detail.status : typeof detail?.code === 'string' ? detail.code : 'http_error'
  const message = typeof detail?.message === 'string' ? detail.message : typeof detail === 'string' ? detail : body
  return { status: res.status, reason, detail: message.slice(0, 200) }
}
