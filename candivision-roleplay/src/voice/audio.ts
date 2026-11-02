/*
  Phones only let a page make or capture sound once a tap has started it. iPhone Safari is the strict one: a sound
  started after a network wait counts as autoplay and is blocked. So one audio context and one audio element are
  created and unlocked inside a tap, and reused for every later line and every utterance.
*/

/** A 0.05 s silent WAV, played once inside a tap to unlock the shared audio element. */
const SILENCE = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQQAAAAAAAAA'

let context: AudioContext | null = null
let element: HTMLAudioElement | null = null

/** The one audio context for capture; created on first use, ideally inside a tap. */
export function audioContext(): AudioContext {
  context ??= new AudioContext()
  return context
}

/** The one audio element for the character's voice. */
export function audioElement(): HTMLAudioElement {
  element ??= new Audio()
  return element
}

/** Call at the start of a tap or key press that leads to sound: starting a call, holding to talk. */
export function unlockAudio(): void {
  try {
    const ctx = audioContext()
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
  } catch {
    // no Web Audio here; capture reports its own error
  }
  try {
    const el = audioElement()
    if (el.paused) {
      el.src = SILENCE
      void el.play().catch(() => {})
    }
  } catch {
    // no audio element here; the player falls back to the browser's own voice
  }
}
