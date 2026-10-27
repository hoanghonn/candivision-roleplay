import type { TeamReport } from '@roleplay/core'
import { useEffect, useState } from 'react'
import { api } from '../api'
import { href } from '../route'

type Body = { title: string; programmeId: string; hash: string; published: number; report: TeamReport }

const STATUS = { passed: 'Ready at the gate', not_yet: 'Not yet', waiting: 'Waiting for you to settle a line' } as const
const pct = (c: { pass: number; of: number }) => (c.of ? Math.round((c.pass / c.of) * 100) : 0)

export default function Report({ versionId }: { versionId: string }) {
  const [b, setB] = useState<Body | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { api<Body>(`/api/versions/${encodeURIComponent(versionId)}/report`).then(setB).catch((e) => setError(e.message)) }, [versionId])

  if (error) return <main className="page narrow"><p className="error">{error}</p></main>
  if (!b) return <main className="page"><p className="muted">Loading…</p></main>
  const r = b.report

  return (
    <main className="page">
      <a className="back" href={href({ name: 'programme', id: b.programmeId })}>← {b.title}</a>
      <p className="eyebrow">Team report · version {b.hash}</p>
      <h1>{r.learners === 0 ? 'Nobody has taken this call yet' : `${r.passedLatest} of ${r.learners} are ready at the gate`}</h1>
      {r.learners > 0 && (
        <p className="lede">
          On their first try, {r.passedFirstTry} of {r.learners} passed every must-have. Everyone is compared on the same version, so before and after compare like with like.
          {r.waiting > 0 && ` ${r.waiting} ${r.waiting === 1 ? 'person has' : 'people have'} a line waiting for you to settle.`}
        </p>
      )}
      {r.hasSample && <p className="banner">Sample team - made-up data for the demo. Your own calls on this programme are added and marked "live".</p>}

      {r.learners > 0 && (
        <>
          <h2>By skill: first try and latest</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Skill</th><th>First try</th><th>Latest</th><th style={{ width: '30%' }}>Latest</th></tr></thead>
              <tbody>
                {r.skills.map((s) => (
                  <tr key={s.skillId}>
                    <td>{s.name}</td>
                    <td>{s.firstTry.pass} of {s.firstTry.of}</td>
                    <td>{s.latest.pass} of {s.latest.of}</td>
                    <td><div className="bar" aria-hidden><div style={{ width: `${pct(s.latest)}%` }} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2>People</h2>
          <p className="muted small">Listed by name, never by result.</p>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Status</th><th>Full calls</th><th /></tr></thead>
              <tbody>
                {r.people.map((p) => (
                  <tr key={`${p.sample}:${p.learner}`}>
                    <td>{p.learner}</td>
                    <td>{STATUS[p.status]}</td>
                    <td>{p.calls}</td>
                    <td className="muted small">{p.sample ? 'sample' : 'live'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p className="muted small" style={{ marginTop: 24 }}>
        What this shows: whether people can do the skill in practice (learning). Whether they do it with real clients, and whether escalations drop, needs evidence from the job (Kirkpatrick levels 3 and 4).
      </p>
      <footer className="footer">For training only. Not for hiring, firing or performance ratings.</footer>
    </main>
  )
}
