import type { Problem, Programme as ProgrammeT, ResearchBrief } from '@roleplay/core'
import { useEffect, useState } from 'react'
import { api, ApiError, CASE_LABELS, LANGUAGE_LABELS, post } from '../api'
import { Chips, sourceLabel } from '../components/SourceChip'
import { href } from '../route'

type Detail = {
  id: string
  caseId: string | null
  programme: ProgrammeT | null
  brief: ResearchBrief | null
  files: { id: string; name: string }[]
  status: 'draft' | 'published'
  mix: 'research' | 'customer' | 'mixed' | null
  testCall: { ok: boolean; notes: string[] } | null
  readyBuilt: boolean
  sampleCallId?: string | null
  versions: { id: string; hash: string; published: number }[]
}

const MIX_LABEL = { research: 'Built on research', customer: 'Built on your material', mixed: 'Research and your material' }

export default function Programme({ id }: { id: string }) {
  const [d, setD] = useState<Detail | null>(null)
  const [error, setError] = useState('')
  const [instruction, setInstruction] = useState('')
  const [editing, setEditing] = useState(false)
  const [changes, setChanges] = useState<string[]>([])
  const [problems, setProblems] = useState<Problem[]>([])
  const [testing, setTesting] = useState(false)
  const [published, setPublished] = useState<{ versionId: string; hash: string } | null>(null)

  const load = () => api<Detail>(`/api/programmes/${encodeURIComponent(id)}`).then(setD).catch((e) => setError(e.message))
  useEffect(() => { void load() }, [id])

  if (error) return <main className="page narrow"><p className="error">{error}</p><a href={href({ name: 'home' })}>Home</a></main>
  if (!d) return <main className="page"><p className="muted">Loading…</p></main>
  if (!d.programme || !d.brief)
    return (
      <main className="page narrow">
        <a className="back" href={href({ name: 'home' })}>← Home</a>
        <h1>This programme is not ready yet</h1>
        <p className="muted">It is still being researched, or it needs your input first.</p>
      </main>
    )

  const p = d.programme
  const brief = d.brief
  const version = published ?? (d.versions[0] && { versionId: d.versions[0].id, hash: d.versions[0].hash })
  const upToDate = published || d.status === 'published'

  async function applyEdit() {
    setEditing(true)
    setProblems([])
    setChanges([])
    try {
      const res = await post<{ programme: ProgrammeT; changes: string[] }>(`/api/programmes/${encodeURIComponent(id)}/edit`, { instruction })
      setChanges(res.changes.length ? res.changes : ['Done.'])
      setInstruction('')
      setPublished(null)
      await load()
    } catch (e) {
      if (e instanceof ApiError && e.body?.problems) setProblems(e.body.problems)
      else setProblems([{ path: '', message: e instanceof Error ? e.message : 'That change could not be applied.' }])
    } finally {
      setEditing(false)
    }
  }

  async function testCall() {
    setTesting(true)
    try {
      await post(`/api/programmes/${encodeURIComponent(id)}/test-call`)
      await load()
    } catch (e) {
      setProblems([{ path: '', message: e instanceof Error ? e.message : 'The test call could not run.' }])
    } finally {
      setTesting(false)
    }
  }

  async function publish() {
    try {
      setPublished(await post<{ versionId: string; hash: string }>(`/api/programmes/${encodeURIComponent(id)}/publish`))
    } catch (e) {
      setProblems([{ path: '', message: e instanceof Error ? e.message : 'Publishing failed.' }])
    }
  }

  const skillName = (sid: string) => p.skills.find((s) => s.id === sid)?.name ?? ''

  return (
    <main className="page">
      <a className="back" href={href({ name: 'home' })}>← Home</a>
      <p className="eyebrow">{CASE_LABELS[d.caseId ?? 'generic']} · {LANGUAGE_LABELS[p.language] ?? p.language}{d.readyBuilt ? ' · Ready-built' : ''}</p>
      <h1>{p.title}</h1>
      <p className="row">
        {d.mix && <span className="badge">{MIX_LABEL[d.mix]}</span>}
        <span className="muted">The learner is the {p.learnerRole.toLowerCase()}. The AI plays {p.persona.name}, {p.persona.role}.</span>
      </p>

      <div className="layout-2">
        <div>
          <h2>Skills</h2>
          {p.skills.map((s) => (
            <div key={s.id} className="rubric-line">
              <strong>{s.name}</strong> <Chips g={s} brief={brief} files={d.files} />
              <div className="muted small">{s.why}</div>
            </div>
          ))}

          <h2>Levels</h2>
          {p.levels.map((l) => (
            <div key={l.id} className="rubric-line">
              <strong>{l.id} · {l.title}</strong> <Chips g={l} brief={brief} files={d.files} />
              <div className="small">{l.situation}</div>
              <div className="quote">"{l.opening}"</div>
            </div>
          ))}

          <h2>What "ready" means</h2>
          <p className="muted small">A learner passes when every must-have line passes. Two independent AI judges score each line.</p>
          {p.rubric.map((r) => (
            <div key={r.id} className="rubric-line" data-testid="rubric-line">
              {r.mustHave ? <span className="must">Must-have</span> : <span className="nice">Nice to have</span>}
              <strong>{r.text}</strong> <Chips g={r} brief={brief} files={d.files} />
              <div className="muted small">{skillName(r.skillId)} · Try: {r.tryThis}</div>
            </div>
          ))}
        </div>

        <aside>
          <h2>The evidence</h2>
          {(['handle', 'learn'] as const).map((use) => (
            <div key={use}>
              <h3>{use === 'handle' ? 'How experts handle it' : 'How people learn it'}</h3>
              <ul className="list">
                {brief.items.filter((i) => i.use === use).map((i) => {
                  const s = brief.sources.find((x) => x.id === i.sourceId)
                  return s ? (
                    <li key={i.sourceId} className="small">
                      <a href={s.link} target="_blank" rel="noreferrer">{sourceLabel(s)}</a>: {i.gives}
                    </li>
                  ) : null
                })}
              </ul>
            </div>
          ))}
          {brief.notFound.length > 0 && (
            <>
              <h3>Not found by research</h3>
              <ul className="list">{brief.notFound.map((q) => <li key={q} className="small">{q}</li>)}</ul>
            </>
          )}
          {d.files.length > 0 && (
            <>
              <h3>Your material</h3>
              <ul className="list">{d.files.map((f) => <li key={f.id} className="small">{f.name}</li>)}</ul>
            </>
          )}
          <h3>The character</h3>
          <p className="small">{p.persona.style}</p>
          <p className="small muted">{p.persona.facts.length} hidden facts the learner has to earn.</p>
        </aside>
      </div>

      {!d.readyBuilt && (
        <section className="card" style={{ marginTop: 24 }}>
          <label className="field">
            <span>Change it in plain words</span>
            <textarea rows={2} maxLength={500} value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder="Make the client angrier at level 2, and use polite Japanese." />
          </label>
          <div className="row">
            <button className="button" disabled={!instruction.trim() || editing} onClick={applyEdit}>{editing ? 'Applying…' : 'Apply the change'}</button>
            <button className="button" disabled={testing} onClick={testCall}>{testing ? 'Running a test call…' : 'Run a test call'}</button>
            <button className="button primary" onClick={publish}>{upToDate ? 'Publish again' : 'Publish to the team'}</button>
          </div>
          {changes.length > 0 && <ul className="list small">{changes.map((c) => <li key={c}>{c}</li>)}</ul>}
          {problems.length > 0 && <div className="error">{problems.map((x, i) => <p key={i}>{x.message}</p>)}</div>}
          {d.testCall && (
            <p className={d.testCall.ok ? 'small' : 'banner'}>
              Test call: {d.testCall.ok ? 'the character stayed in role.' : 'the character slipped out of role.'} {d.testCall.notes.join(' ')}
            </p>
          )}
        </section>
      )}

      {version && (
        <section>
          <h2>Take the call</h2>
          <p className="muted small">Version {version.hash}. Retests use this same version, so before and after compare like with like.</p>
          <div className="row">
            {p.levels.map((l) => (
              <a key={l.id} className="button primary" href={href({ name: 'call', versionId: version.versionId, level: l.id })}>
                {l.id}: {l.title}
              </a>
            ))}
            <a className="button" href={href({ name: 'report', versionId: version.versionId })}>Team report</a>
            {d.sampleCallId && <a className="button" href={href({ name: 'debrief', callId: d.sampleCallId })}>See a sample debrief</a>}
          </div>
        </section>
      )}
    </main>
  )
}
