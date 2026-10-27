import type { VoiceId } from '@roleplay/core'

/** ElevenLabs premade voices; eleven_flash_v2_5 speaks Vietnamese and Japanese with the same voices. */
export const VOICES: Record<VoiceId, { id: string; label: string }> = {
  woman: { id: 'EXAVITQu4vr4xnSDxMaL', label: 'Woman' },
  man: { id: 'pNInz6obpgDQGcFmaJgB', label: 'Man' },
  older_man: { id: 'JBFqnCBsd6RMkjVDRZzb', label: 'Older man' },
}
