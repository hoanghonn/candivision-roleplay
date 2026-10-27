import type { Turn, VoiceId } from '@roleplay/core'
import { useEffect, useRef, useState } from 'react'
import { ApiError, post, visitorId, wsUrl } from '../api'
import MoodBar from '../components/MoodBar'
import { href, navigate } from '../route'
import { browserPlayer, type SayItem } from '../voice/player'
import { PushToTalk, type PttOptions, type PttState } from '../voice/pushToTalk'

type Started = {
  callId: string
  opening: string
  mood: number
  persona: { name: string; role: string; voice: VoiceId }
  language: string
  maxSeconds: number
  level: { id: string; title: string; situation: string }
  instructions: string
  learnerRole: string
  drill: { lineId: string; text: string; tryThis: string } | null
}
type Ptt = { start(): Promise<void> | void; stop(): void }

type Props = {
  versionId: string
  level: string
  drillLineId?: string
  makePtt?: (o: PttOptions) => Ptt
  player?: { say(item: SayItem): Promise<void> }
}

const readName = () => { try { return localStorage.getItem('cvr.learner') ?? '' } catch { return '' } }
const saveName = (n: string) => { try { localStorage.setItem('cvr.learner', n) } catch { /* private mode */ } }

export default function Call({ versionId, level, drillLineId, makePtt = (o) => new PushToTalk(o), player = browserPlayer }: Props) {
  const [name, setName] = useState(readName)
  const [call, setCall] = useState<Started | null>(null)
  const [turns, setTurns] = useState<Turn[]>([])
  const [mood, setMood] = useState(50)
  const [ptt, setPtt] = useState<PttState>('idle')
  const [partial, setPartial] = useState('')
  const [typing, setTyping] = useState(false)
  const [typed, setTyped] = useState('')
  const [waiting, setWaiting] = useState(false)
  const [toast, setToast] = useState('')
  const [left, setLeft] = useState(0)
  const [portrait, setPortrait] = useState<string | null>(null)
  const [error, setError] = useState('')
  const pttRef = useRef<Ptt | null>(null)
  const ending = useRef(false)
  const callRef = useRef<Started | null>(null)
  const transcriptRef = useRef<HTMLDivElement>(null)

  async function start() {
    setError('')
    saveName(name.trim())
    try {
      const body = { versionId, learner: name.trim(), level, mode: drillLineId ? 'drill' : 'full', ...(drillLineId ? { drillLineId } : {}) }
      const c = await post<Started>('/api/calls', body)
      callRef.current = c
      setCall(c)
      setMood(c.mood)
      setLeft(c.maxSeconds)
      setTurns([{ speaker: 'persona', text: c.opening, atMs: 0, mood: c.mood }])
      pttRef.current = makePtt({
        wsUrl: wsUrl(`/ws/stt?v=${visitorId()}&callId=${encodeURIComponent(c.callId)}`),
        onState: (s) => { setPtt(s); if (s === 'no-mic' || s === 'error') setTyping(true) },
        onPartial: setPartial,
        onFinal: (t) => { setPartial(''); void say(t) },
      })
      void player.say({ voice: c.persona.voice, text: c.opening, lang: c.language })
      post<{ url: string }>('/api/portrait', { versionId }).then((r) => setPortrait(r.url)).catch(() => {})
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'The call could not start. Please try again.')
    }
  }

  async function end() {
    const c = callRef.current
    if (!c || ending.current) return
    ending.current = true
    pttRef.current?.stop()
    await post(`/api/calls/${encodeURIComponent(c.callId)}/end`).catch(() => {})
    navigate({ name: 'debrief', callId: c.callId })
  }

  async function say(text: string) {
    const c = callRef.current
    if (!c || ending.current || !text.trim()) return
    setTurns((t) => [...t, { speaker: 'learner', text, atMs: 0, mood: null }])
    setWaiting(true)
    try {
      const r = await post<{ say: string; mood: number; revealed: string[]; ended: boolean }>(`/api/calls/${encodeURIComponent(c.callId)}/turn`, { text })
      if (r.say) setTurns((t) => [...t, { speaker: 'persona', text: r.say, atMs: 0, mood: r.mood }])
      setMood(r.mood)
      if (r.revealed.length) setToast(`New: ${r.revealed.join(' ')}`)
      if (r.say) await player.say({ voice: c.persona.voice, text: r.say, lang: c.language })
      if (r.ended) await end()
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) await end()
      else setError('That turn did not go through. Please say it again.')
    } finally {
      setWaiting(false)
    }
  }

  useEffect(() => {
    if (!call) return
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [call])
  useEffect(() => { if (call && left === 0) void end() }, [left, call])
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(''), 6000); return () => clearTimeout(t) } }, [toast])
  useEffect(() => { transcriptRef.current?.scrollTo?.({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' }) }, [turns, partial])
  useEffect(() => {
    if (!call || typing) return
    const down = (e: KeyboardEvent) => { if (e.code === 'Space' && !e.repeat && !(e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement)) { e.preventDefault(); void pttRef.current?.start() } }
    const up = (e: KeyboardEvent) => { if (e.code === 'Space') pttRef.current?.stop() }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [call, typing])

  if (!call)
    return (
      <main className="page narrow">
        <a className="back" href={href({ name: 'home' })}>← Home</a>
        <p className="eyebrow">{drillLineId ? '60-second drill' : `Voice role-play · ${level}`}</p>
        <h1>Ready for the call?</h1>
        <p className="lede">You will talk to an AI character by holding the button (or the space bar) while you speak. Speak as you would on a real call.</p>
        <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) void start() }}>
          <label className="field">
            <span>Your name (only your training lead sees it)</span>
            <input type="text" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} autoComplete="given-name" />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="button primary big" type="submit" disabled={!name.trim()}>Start the call</button>
        </form>
        <p className="muted small">For training only. Your result is never used for hiring, firing or performance ratings.</p>
      </main>
    )

  const mm = String(Math.floor(left / 60)).padStart(1, '0')
  const ss = String(left % 60).padStart(2, '0')

  return (
    <main className="page">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <p className="eyebrow">{call.drill ? `Drill: ${call.drill.text}` : `${call.level.id} · ${call.level.title}`}</p>
        <span className="timer" aria-label="Time left">{mm}:{ss}</span>
      </div>
      <div className="call">
        <aside>
          {portrait ? <img className="portrait" src={portrait} alt={`Portrait of ${call.persona.name}`} /> : <div className="portrait" aria-hidden>{call.persona.name.slice(0, 1)}</div>}
          <h2 style={{ marginTop: 12 }}>{call.persona.name}</h2>
          <p className="muted small">{call.persona.role}</p>
          <MoodBar mood={mood} />
          <p className="small muted" style={{ marginTop: 16 }}>{call.drill ? `Try: ${call.drill.tryThis}` : call.instructions}</p>
        </aside>
        <section>
          <div className="transcript" ref={transcriptRef}>
            {turns.map((t, i) => (
              <div key={i} className={`turn ${t.speaker}`}>
                <div className="who">{t.speaker === 'persona' ? call.persona.name : 'You'}</div>
                {t.text}
              </div>
            ))}
            {partial && <div className="turn learner muted">{partial}…</div>}
            {waiting && <div className="turn persona muted">…</div>}
          </div>
          {error && <p className="error">{error}</p>}
          {typing ? (
            <form className="row" onSubmit={(e) => { e.preventDefault(); const t = typed; setTyped(''); void say(t) }}>
              <label className="field" style={{ flex: 1, margin: 0 }}>
                <span className="small">Type what you say</span>
                <input type="text" value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
              </label>
              <button className="button primary" type="submit" disabled={!typed.trim() || waiting}>Send</button>
            </form>
          ) : (
            <button
              className={`button primary talk ${ptt === 'listening' ? 'live' : ''}`}
              disabled={waiting}
              onPointerDown={() => void pttRef.current?.start()}
              onPointerUp={() => pttRef.current?.stop()}
              onPointerLeave={() => ptt === 'listening' && pttRef.current?.stop()}
            >
              {ptt === 'listening' ? 'Listening… release when you finish' : ptt === 'thinking' ? 'Hearing you…' : 'Hold to talk (or hold space)'}
            </button>
          )}
          <div className="row">
            <button className="link" onClick={() => setTyping((t) => !t)}>{typing ? 'Use my voice instead' : 'Type instead'}</button>
            <button className="button" onClick={() => void end()}>End the call</button>
          </div>
        </section>
      </div>
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  )
}
