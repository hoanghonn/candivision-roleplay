import { useEffect, useState } from 'react'
import { api, CASE_LABELS, LANGUAGE_LABELS, type ProgrammeSummary } from '../api'
import { href } from '../route'
import { MODE_BANNER, useSiteMode } from '../useStatus'

export default function Home() {
  const mode = useSiteMode()
  const [programmes, setProgrammes] = useState<ProgrammeSummary[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api<ProgrammeSummary[]>('/api/programmes').then(setProgrammes).catch((e) => setError(e.message))
  }, [])

  const library = programmes?.filter((p) => p.readyBuilt) ?? []
  const mine = programmes?.filter((p) => !p.readyBuilt) ?? []

  return (
    <main className="page">
      <header className="hero">
        <p className="eyebrow">CandiVision Roleplay</p>
        <h1>Role-play built on research, not guesswork.</h1>
        <p className="lede">
          Describe a hard conversation your people get wrong. We find the research and proven methods first, build a voice role-play where every
          rubric line names its source, and give each learner feedback tied to the moment in the call.
        </p>
        {mode && mode !== 'read_only' && mode !== 'calls_only' && (
          <a className="button primary" href={href({ name: 'request' })}>
            Build your own programme
          </a>
        )}
        {mode && mode !== 'full' && <p className="banner">{MODE_BANNER[mode]}</p>}
      </header>

      {error && <p className="error">{error}</p>}

      <section>
        <h2>Try a ready-built programme</h2>
        <p className="muted">Each one was made by the same research pipeline. Start a call in one click.</p>
        <div className="grid">
          {library.map((p) => (
            <article key={p.id} className="card">
              <p className="tag">{CASE_LABELS[p.caseId ?? 'generic']} · {LANGUAGE_LABELS[p.language ?? 'en'] ?? p.language}</p>
              <h3>{p.title}</h3>
              <div className="row">
                {p.latestVersionId && mode !== 'read_only' && (
                  <a className="button primary" href={href({ name: 'call', versionId: p.latestVersionId, level: 'L1' })} aria-label={`Start the call: ${p.title}`}>
                    Start the call
                  </a>
                )}
                <a className="button" href={href({ name: 'programme', id: p.id })}>
                  See the research
                </a>
              </div>
            </article>
          ))}
          {programmes && library.length === 0 && <p className="muted">The ready-built programmes are loading. Refresh in a moment.</p>}
        </div>
      </section>

      {mine.length > 0 && (
        <section>
          <h2>Your programmes</h2>
          <ul className="list">
            {mine.map((p) => (
              <li key={p.id}>
                <a href={href({ name: 'programme', id: p.id })}>{p.title}</a>
                <span className="muted"> · {p.status === 'published' ? 'Published' : p.ready ? 'Draft' : 'Being built'}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="footer">For training only. Not for hiring, firing or performance ratings.</footer>
    </main>
  )
}
