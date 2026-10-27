import type { Debrief as DebriefT, LineResult, Turn } from '@roleplay/core'
import { useEffect, useState } from 'react'
import { api, post } from '../api'
import { href } from '../route'

type CallView = {
  id: string
  learner: string
  level: string
  mode: 'full' | 'drill'
  versionId: string
  programmeId: string
  title: string
  persona: { name: string; role: string }
  turns: Turn[]
  sample?: boolean
  debrief: DebriefT | null
}

const ICON = { pass: '✅', partly: '⚠️', missed: '❌', unsure: '❓' } as const
const WORD = { pass: 'Done', partly: 'Partly', missed: 'Not yet', unsure: 'Judges disagree' } as const
const clock = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`

export default function Debrief({ callId }: { callId: string }) {
  const [call, setCall] = useState<CallView | null>(null)
  const [error, setError] = useState('')

  const [partial, setPartial] = useState(false)
  const [scoring, setScoring] = useState(false)

  /** Scores the call (or returns the stored result); a judge that could not be reached leaves it partial. */
  async function score() {
    setScoring(true)
    try {
      const d = await post<DebriefT & { scoredFully?: boolean }>(`/api/calls/${encodeURIComponent(callId)}/end`)
      setPartial(d.scoredFully === false)
      setCall((c) => (c ? { ...c, debrief: d } : c))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The call could not be scored.')
    } finally {
      setScoring(false)
    }
  }

  useEffect(() => {
    api<CallView>(`/api/calls/${encodeURIComponent(callId)}`)
      .then((c) => {
        setCall(c)
        if (!c.debrief && !c.sample) void score()
      })
      .catch((e) => setError(e.message))
  }, [callId])

  async function settleLine(lineId: string, result: LineResult) {
    const d = await post<DebriefT>(`/api/calls/${encodeURIComponent(callId)}/settle`, { lineId, result })
    setCall((c) => (c ? { ...c, debrief: d } : c))
  }

  if (error) return <main className="page narrow"><p className="error">{error}</p></main>
  if (!call?.debrief) return <main className="page narrow"><h1>Two judges are reading your call…</h1><p className="muted">This takes about ten seconds.</p></main>

  const d = call.debrief
  return (
    <main className="page">
      <a className="back" href={href({ name: 'programme', id: call.programmeId })}>← {call.title}</a>
      <p className="eyebrow">Your debrief · {call.mode === 'drill' ? '60-second drill' : call.level} · {call.learner}</p>
      {partial && (
        <p className="banner">
          One of the two judges could not be reached, so lines it did not read show as unsure.{' '}
          <button className="button" disabled={scoring} onClick={() => void score()}>{scoring ? 'Scoring…' : 'Score again'}</button>
        </p>
      )}
      {call.sample && <p className="banner">Sample call: an AI played the learner, so you can see a debrief without taking the call. Real calls are scored the same way.</p>}
      <h1 className={`verdict ${d.passed ? 'passed' : 'notyet'}`}>
        {d.passed ? 'Ready at the gate: every must-have was done.' : d.waiting ? `Not yet, and ${d.waiting === 1 ? 'one line is' : 'some lines are'} waiting for your training lead.` : 'Not yet: one or more must-haves still to practise.'}
      </h1>

      <div className="layout-2">
        <section>
          {d.lines.map((l) => (
            <div key={l.lineId} className={`result ${l.result}`}>
              <div className="icon" aria-hidden>{ICON[l.result]}</div>
              <div>
                <div>
                  {l.mustHave ? <span className="must">Must-have</span> : <span className="nice">Nice to have</span>}
                  <strong>{l.text}</strong> <span className="muted small">· {WORD[l.result]}</span>
                </div>
                {l.moment && (
                  <p className="small" style={{ margin: '6px 0' }}>
                    <a href={`#turn-${l.moment.turn}`} onClick={(e) => { e.preventDefault(); document.getElementById(`turn-${l.moment!.turn}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }}>
                      At {clock(l.moment.atMs)}
                    </a>{' '}
                    you said: <span className="quote">"{l.moment.quote}"</span>
                  </p>
                )}
                {l.result === 'unsure' && !call.sample && (
                  <div className="card small" style={{ margin: '8px 0' }}>
                    <p style={{ marginTop: 0 }}>The two AI judges read this differently, so it does not count yet. Your training lead decides.</p>
                    {l.readings.map((r, i) => (
                      <p key={i} style={{ margin: '2px 0' }}>Judge {i + 1}: {r ? r.result : 'no valid reading'}{r?.quote ? ` - "${r.quote}"` : ''}</p>
                    ))}
                    <div className="row">
                      {(['pass', 'partly', 'missed'] as const).map((res) => (
                        <button key={res} className="button" onClick={() => void settleLine(l.lineId, res)}>Count it as {res}</button>
                      ))}
                    </div>
                  </div>
                )}
                {l.result !== 'pass' && <p className="small" style={{ margin: '4px 0' }}><strong>Try this:</strong> {l.tryThis}</p>}
                {l.source && (
                  <p className="small muted" style={{ margin: '4px 0' }}>
                    Why: {'link' in l.source ? <a href={l.source.link} target="_blank" rel="noreferrer">{l.source.title}</a> : <>your file {l.source.file}, "{l.source.quote}"</>}
                  </p>
                )}
              </div>
            </div>
          ))}

          {d.drill && (
            <div className="card" style={{ marginTop: 20 }}>
              <h2 style={{ marginTop: 0 }}>Next: one short drill</h2>
              <p>{d.drill.instruction}</p>
              <p className="muted small">{d.drill.why}</p>
              <a className="button primary" href={href({ name: 'call', versionId: call.versionId, level: call.level, drillLineId: d.drill.lineId })}>Start the 60-second drill</a>
            </div>
          )}
          <div className="row" style={{ marginTop: 16 }}>
            <a className="button" href={href({ name: 'call', versionId: call.versionId, level: call.level })}>Take the whole call again</a>
            <a className="button" href={href({ name: 'report', versionId: call.versionId })}>Team report</a>
          </div>
          <p className="muted small">
            Scored by two independent AI judges: Muse Spark (Meta) and {d.judge2 === 'baseten' ? 'Muse Spark Open (on Baseten)' : 'a second pass of Muse Spark with a different prompt (the open model was unavailable)'}. A line counts only when both agree.
          </p>
        </section>

        <aside>
          <h2>The call</h2>
          <div className="transcript" style={{ maxHeight: '70vh' }}>
            {call.turns.map((t, i) => (
              <div key={i} id={`turn-${i}`} className={`turn ${t.speaker}`}>
                <div className="who">{t.speaker === 'persona' ? call.persona.name : 'You'} · {clock(t.atMs)}</div>
                {t.text}
              </div>
            ))}
          </div>
        </aside>
      </div>
      <footer className="footer">For training only. Not for hiring, firing or performance ratings.</footer>
    </main>
  )
}
