import type { VoiceId } from '@roleplay/core'
import { visitorId } from '../api'

/** A line the character said: where it sits in the call, so the server speaks only real character lines. */
export type SayItem = { voice: VoiceId; text: string; lang: string; callId: string; turn: number }

export type PlayerDeps = {
  /** Plays an audio URL; resolves when it has finished. */
  playUrl(src: string): Promise<void>
  /** Returns a playable URL for the line, or null when the voice service is unavailable. */
  fetchTts(item: SayItem): Promise<string | null>
  /** The browser's own voice, used when the voice service is unavailable. */
  speak(text: string, lang: string): Promise<void>
}

/** One queue, so the character never talks over itself. */
export function createPlayer(deps: PlayerDeps) {
  let tail: Promise<void> = Promise.resolve()

  async function playOne(item: SayItem) {
    try {
      if (!item.text) return
      const url = await deps.fetchTts(item)
      if (url) await deps.playUrl(url)
      else await deps.speak(item.text, item.lang)
    } catch {
      // a clip that fails to play is skipped
    }
  }

  return {
    say(item: SayItem): Promise<void> {
      tail = tail.then(() => playOne(item))
      return tail
    },
  }
}

const BCP47: Record<string, string> = { en: 'en-US', vi: 'vi-VN', ja: 'ja-JP' }

/** The real browser implementation. */
export const browserPlayer = createPlayer({
  playUrl: (src) =>
    new Promise<void>((resolve, reject) => {
      const audio = new Audio(src)
      audio.onended = () => resolve()
      audio.onerror = () => reject(new Error('audio failed'))
      audio.play().catch(reject)
    }),
  fetchTts: async (item) => {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-visitor-id': visitorId() },
      body: JSON.stringify({ callId: item.callId, turn: item.turn }),
      signal: AbortSignal.timeout(10_000),
    }).catch(() => null)
    if (!res?.ok) return null
    return URL.createObjectURL(await res.blob())
  },
  speak: (text, lang) =>
    new Promise<void>((resolve) => {
      if (!('speechSynthesis' in window)) return resolve()
      const u = new SpeechSynthesisUtterance(text)
      u.lang = BCP47[lang] ?? lang
      u.onend = () => resolve()
      u.onerror = () => resolve()
      speechSynthesis.speak(u)
    }),
})
