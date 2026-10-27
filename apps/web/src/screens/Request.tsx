import { useEffect, useRef, useState } from 'react'
import { ApiError, post, visitorId, wsUrl } from '../api'
import { href, navigate } from '../route'
import { MODE_BANNER, useSiteMode } from '../useStatus'
import { PushToTalk, type PttState } from '../voice/pushToTalk'

type Uploaded = { id: string; name: string }

const EXAMPLE =
  "When production goes down, our engineers call the client and it gets worse. They over-explain the technical cause, never say sorry, and can't give a time for the fix. Last month a client escalated to our CEO."

export default function Request() {
  const mode = useSiteMode()
  const [text, setText] = useState('')
  const [files, setFiles] = useState<Uploaded[]>([])
  const [fileError, setFileError] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [speakLang, setSpeakLang] = useState<'en' | 'vi'>('en')
  const [ptt, setPtt] = useState<PttState>('idle')
  const [partial, setPartial] = useState('')
  const pttRef = useRef<PushToTalk | null>(null)

  useEffect(() => {
    pttRef.current = new PushToTalk({
      wsUrl: wsUrl(`/ws/stt?v=${visitorId()}&lang=${speakLang}`),
      onState: setPtt,
      onPartial: setPartial,
      onFinal: (t) => { setPartial(''); setText((prev) => (prev ? `${prev} ${t}` : t)) },
    })
  }, [speakLang])

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setFileError('')
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch('/api/files', { method: 'POST', body: form, headers: { 'x-visitor-id': visitorId() } })
      const body = await res.json().catch(() => null)
      if (!res.ok) return setFileError(body?.message ?? 'That file could not be read.')
      setFiles((f) => [...f, { id: body.id, name: body.name }].slice(0, 5))
    } catch {
      setFileError('That file could not be uploaded. Please try again.')
    }
  }

  async function submit() {
    setBusy(true)
    setError('')
    try {
      const { jobId } = await post<{ jobId: string }>('/api/requests', { text: text.trim(), fileIds: files.map((f) => f.id) })
      navigate({ name: 'job', id: jobId })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.')
      setBusy(false)
    }
  }

  const canBuild = text.trim().length >= 10 && !busy && (mode === null || mode === 'full')

  return (
    <main className="page narrow">
      <a className="back" href={href({ name: 'home' })}>← Home</a>
      <h1>What should your people practise?</h1>
      <p className="lede">Describe the conversation that goes wrong, in plain words or by voice. Attach anything that shows it: an email thread, a ticket, a policy, a playbook.</p>
      {mode && mode !== 'full' && <p className="banner">{MODE_BANNER[mode]}</p>}

      <label className="field">
        <span>What is going wrong, and for whom?</span>
        <textarea rows={7} value={text} maxLength={4000} onChange={(e) => setText(e.target.value)} placeholder={EXAMPLE} />
      </label>
      {partial && <p className="muted">Hearing: {partial}</p>}

      <div className="row">
        <button
          type="button"
          className={`button ${ptt === 'listening' ? 'live' : ''}`}
          onPointerDown={() => pttRef.current?.start()}
          onPointerUp={() => pttRef.current?.stop()}
          onPointerLeave={() => ptt === 'listening' && pttRef.current?.stop()}
        >
          {ptt === 'listening' ? 'Listening… release to stop' : 'Hold to speak'}
        </button>
        <select aria-label="Speaking language" value={speakLang} onChange={(e) => setSpeakLang(e.target.value as 'en' | 'vi')}>
          <option value="en">English</option>
          <option value="vi">Tiếng Việt</option>
        </select>
        {ptt === 'no-mic' && <span className="muted">No microphone found. Type instead.</span>}
        {!text && <button type="button" className="link" onClick={() => setText(EXAMPLE)}>Use the outage example</button>}
      </div>

      <label className="field">
        <span>Attach your material (optional: .txt, .md, .eml or .pdf, up to 2 MB)</span>
        <input type="file" accept=".txt,.md,.eml,.pdf" onChange={onFile} />
      </label>
      {fileError && <p className="error">{fileError}</p>}
      {files.length > 0 && (
        <ul className="chips">
          {files.map((f) => (
            <li key={f.id} className="chip">
              <span>{f.name}</span>
              <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles((all) => all.filter((x) => x.id !== f.id))}>×</button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="error">{error}</p>}
      <button type="button" className="button primary big" disabled={!canBuild} onClick={submit}>
        {busy ? 'Starting…' : 'Research and build'}
      </button>
      <p className="muted small">Research takes about a minute. Your files stay in your private workspace and are never shown to anyone else.</p>
    </main>
  )
}
