import type { Source } from '@roleplay/core'
import { useEffect, useRef, useState } from 'react'
import { visitorId } from '../api'
import { sourceLabel } from '../components/SourceChip'
import { href, navigate } from '../route'

export type EventsLike = { onmessage: ((e: { data: string }) => void) | null; onerror: (() => void) | null; close(): void }

type Found = { source: Source; status: 'checking' | 'verified' | 'dropped' | 'unused'; use?: 'handle' | 'learn'; reason?: string }

const defaultOpen = (url: string): EventsLike => new EventSource(url) as unknown as EventsLike

export default function Job({ id, openEvents = defaultOpen }: { id: string; openEvents?: (url: string) => EventsLike }) {
  const [found, setFound] = useState<Map<string, Found>>(new Map())
  const [searches, setSearches] = useState<string[]>([])
  const [notFound, setNotFound] = useState<string[]>([])
  const [situation, setSituation] = useState('')
  const [phase, setPhase] = useState<'matching' | 'researching' | 'building' | 'declined' | 'questions' | 'failed'>('matching')
  const [message, setMessage] = useState('')
  const [questions, setQuestions] = useState<{ list: string[]; programmeId: string } | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const start = useRef(Date.now())

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.round((Date.now() - start.current) / 1000)), 1000)
    const es = openEvents(`/api/jobs/${encodeURIComponent(id)}/events?v=${visitorId()}`)
    const update = (sourceId: string, patch: Partial<Found>) =>
      setFound((m) => {
        const cur = m.get(sourceId)
        if (!cur) return m
        const next = new Map(m)
        next.set(sourceId, { ...cur, ...patch })
        return next
      })
    es.onmessage = (msg) => {
      const e = JSON.parse(msg.data)
      switch (e.type) {
        case 'matched': setSituation(e.match.situation); setPhase('researching'); break
        case 'searching': setSearches((s) => [...s, e.query]); break
        case 'candidate': setFound((m) => (m.has(e.source.id) ? m : new Map(m).set(e.source.id, { source: e.source, status: 'checking' }))); break
        case 'verified': update(e.sourceId, { status: 'verified', use: e.use }); break
        case 'dropped': update(e.sourceId, { status: /^Not used/.test(e.reason) ? 'unused' : 'dropped', reason: e.reason }); break
        case 'not_found': setNotFound((q) => [...q, e.question]); break
        case 'building': setPhase('building'); break
        case 'done': es.close(); navigate({ name: 'programme', id: e.programmeId }); break
        case 'declined': es.close(); setPhase('declined'); setMessage(e.reason); break
        case 'questions': es.close(); setPhase('questions'); setQuestions({ list: e.questions, programmeId: e.programmeId }); break
        case 'failed': es.close(); setPhase('failed'); setMessage(e.message); break
      }
    }
    es.onerror = () => { /* EventSource reconnects by itself; the server replays stored events */ }
    return () => { clearInterval(t); es.close() }
  }, [id, openEvents])

  const all = [...found.values()]
  const column = (use: 'handle' | 'learn') => all.filter((f) => f.status === 'verified' && f.use === use)
  const pending = all.filter((f) => f.status === 'checking' || f.status === 'dropped')
  const unused = all.filter((f) => f.status === 'unused')

  const item = (f: Found) => (
    <li key={f.source.id} className={`source ${f.status}`}>
      <span>{f.source.title}</span> <span className="muted small">{sourceLabel(f.source)}</span>
      {f.status === 'verified' && <a className="status" href={f.source.link} target="_blank" rel="noreferrer">✓ checked</a>}
      {f.status === 'checking' && <span className="status">checking…</span>}
      {f.status === 'dropped' && <span className="status">{f.reason}</span>}
    </li>
  )

  if (phase === 'declined')
    return (
      <main className="page narrow">
        <h1>We can't build this one</h1>
        <p className="lede">This looks like screening people. CandiVision Roleplay trains people and never ranks them.</p>
        <p className="muted">{message}</p>
        <a className="button" href={href({ name: 'request' })}>Describe a different request</a>
      </main>
    )

  return (
    <main className="page">
      <a className="back" href={href({ name: 'home' })}>← Home</a>
      <p className="eyebrow">Research first</p>
      <h1>{phase === 'building' ? 'Building the programme from the evidence…' : phase === 'matching' ? 'Reading your request…' : 'Finding the evidence…'}</h1>
      {situation && <p className="lede">{situation}</p>}
      <p className="timer">{elapsed}s · {searches.length} searches · {all.filter((f) => f.status === 'verified').length} sources checked</p>
      {phase === 'failed' && <p className="error">{message}</p>}
      {questions && (
        <div className="banner">
          <p>The programme needs your input before it is ready:</p>
          <ul>{questions.list.map((q) => <li key={q}>{q}</li>)}</ul>
          <a href={href({ name: 'programme', id: questions.programmeId })}>Open the draft</a>
        </div>
      )}

      <div className="columns">
        <section aria-label="How experts handle it" className="col">
          <h3>How experts handle it</h3>
          <ul className="list plain">{column('handle').map(item)}</ul>
        </section>
        <section aria-label="How people learn it" className="col">
          <h3>How people learn it</h3>
          <ul className="list plain">{column('learn').map(item)}</ul>
        </section>
        <section aria-label="Being checked" className="col">
          <h3>Being checked</h3>
          {searches.length > 0 && <p className="muted small">Searching: {searches.at(-1)}</p>}
          <ul className="list plain">{pending.map(item)}</ul>
          {unused.length > 0 && (
            <details>
              <summary className="muted small">Also read, not used ({unused.length})</summary>
              <ul className="list plain">{unused.map(item)}</ul>
            </details>
          )}
        </section>
        <section aria-label="Not found, we will ask you" className="col">
          <h3>Not found - we'll ask you</h3>
          {notFound.length === 0 ? <p className="muted small">Nothing yet.</p> : <ul className="list">{notFound.map((q) => <li key={q}>{q}</li>)}</ul>}
        </section>
      </div>
    </main>
  )
}
