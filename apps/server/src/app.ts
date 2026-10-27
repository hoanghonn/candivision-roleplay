import multipart from '@fastify/multipart'
import websocket from '@fastify/websocket'
import { buildDebrief, groundingMix, teamReport, LanguageSchema, LineResultSchema, settle, VoiceIdSchema, type Language } from '@roleplay/core'
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify'
import { editProgramme, MAX_INSTRUCTION } from './builder'
import { extractText, MAX_FILE_BYTES, type IntakeError } from './intake'
import { JobHub, runRequestJob, TERMINAL } from './jobs'
import { siteMode, type LimitKind, type VisitorLimits } from './limits'
import type { ChatClient } from './llm'
import type { Paper } from './papers'
import { scoreCall } from './judges'
import { sampleCallId } from './library'
import { sampleTeam } from './sample'
import { applyReply, personaTurn } from './persona'
import { LIBRARY, type CallRow, type Store, type VersionRow } from './store'
import { runTestCall } from './testcall'
import { bridgeStt, type SocketLike } from './stt'
import { MAX_TTS_CHARS, synthesize, type TtsDeps } from './tts'
import { PRICES, type Budget } from './usage'

export type Deps = {
  store: Store
  limits?: VisitorLimits
  budget?: Budget
  dailyUsd: number
  meta: ChatClient
  /** Muse Spark Open on Baseten, for judge 2; null falls back to a second Muse Spark pass */
  open: ChatClient | null
  searchPapers: (q: string) => Promise<Paper[] | null>
  doiResolves: (doi: string) => Promise<boolean>
  tts?: TtsDeps
  stt?: { connect: () => SocketLike; apiKey: string }
  images?: ImageClient
  now?: () => number
}

export type ImageClient = { generate: (req: any, opts?: any) => Promise<any> }

export const MAX_LEARNER_TURNS = 20
const FULL_SECONDS = 480
const DRILL_SECONDS = 60
const GRACE_MS = 10_000

const VISITOR = /^[A-Za-z0-9-]{8,64}$/
const INTAKE_MESSAGES: Record<IntakeError, string> = {
  too_big: 'This file is over 2 MB. Please upload a smaller file or paste the important part.',
  unsupported: 'This file type is not supported. Please upload a .txt, .md, .eml or .pdf file.',
  no_text: 'We could not read any text in this file. If it is a scanned PDF, please paste the text instead.',
}

export function buildApp(deps: Deps) {
  const app = Fastify({ logger: false, bodyLimit: 1024 * 1024 })
  app.register(websocket, { options: { maxPayload: 64 * 1024 } })
  app.register(multipart, { limits: { fileSize: MAX_FILE_BYTES + 1, files: 1 } })
  const hub = new JobHub()
  const mode = () => siteMode(deps.budget, deps.dailyUsd)
  const now = deps.now ?? Date.now
  const portraits = new Map<string, string>()

  /** A frozen version the visitor may use: their own, or a ready-built one. */
  function usableVersion(ws: string, id: unknown): VersionRow | null {
    if (typeof id !== 'string') return null
    const v = deps.store.version(id)
    return v && (v.ws === ws || v.ws === LIBRARY) ? v : null
  }
  /** A drill is judged and debriefed on its own line only; its scoring key includes that line. */
  function scored(call: CallRow, version: VersionRow) {
    if (call.mode !== 'drill' || !call.drillLineId) return { hash: version.hash, programme: version.programme }
    const programme = { ...version.programme, rubric: version.programme.rubric.filter((r) => r.id === call.drillLineId) }
    return { hash: `${version.hash}:${call.drillLineId}`, programme }
  }
  /** The debrief for a scored call, with the customer file names the programme quotes. */
  function debriefOf(call: CallRow, version: VersionRow, verdicts = call.verdicts) {
    if (!verdicts) return null
    const owner = deps.store.programme(version.ws, version.programmeId)
    const files = owner ? deps.store.files(owner.ws, owner.request.fileIds).map((f) => ({ id: f.id, name: f.name })) : []
    const debrief = buildDebrief(scored(call, version).programme, version.brief, files, call.turns, verdicts)
    // A drill's next step is another go at the same line, never a different one.
    return call.mode === 'drill' && debrief.drill && debrief.drill.lineId !== call.drillLineId ? { ...debrief, drill: null } : debrief
  }
  const maxSeconds = (c: Pick<CallRow, 'mode'>) => (c.mode === 'drill' ? DRILL_SECONDS : FULL_SECONDS)

  /** The visitor id is the workspace; EventSource and WebSocket pass it as ?v= because they cannot set headers. */
  function visitor(req: FastifyRequest, reply: FastifyReply): string | null {
    const v = req.headers['x-visitor-id'] ?? (req.query as any)?.v
    if (typeof v !== 'string' || !VISITOR.test(v)) {
      reply.code(400).send({ error: 'bad request', message: 'Missing visitor id.' })
      return null
    }
    return v
  }
  function take(reply: FastifyReply, ws: string, kind: LimitKind): boolean {
    if (!deps.limits || deps.limits.take(ws, kind)) return true
    const what = { programme: 'three new programmes', edit: 'ten edits', call: 'ten calls' }[kind]
    reply.code(429).send({ error: 'limit', message: `That is ${what} for today. The ready-built programmes are still open, and your limit resets at midnight UTC.` })
    return false
  }
  const notFull = (reply: FastifyReply) =>
    reply.code(503).send({ error: 'busy', message: "Today's budget for building new programmes is used up. The ready-built programmes are still open." })

  app.get('/api/health', async () => ({ ok: true }))
  app.get('/api/status', async () => ({ mode: mode() }))

  app.post('/api/files', async (req, reply) => {
    const ws = visitor(req, reply)
    if (!ws) return reply
    const file = await req.file().catch(() => undefined)
    if (!file) return reply.code(400).send({ error: 'bad request', message: 'No file was sent.' })
    const bytes = await file.toBuffer().catch(() => null)
    if (!bytes || file.file.truncated) return reply.code(400).send({ error: 'too_big', message: INTAKE_MESSAGES.too_big })
    const name = file.filename.slice(0, 120)
    const res = await extractText(name, bytes)
    if ('error' in res) return reply.code(400).send({ error: res.error, message: INTAKE_MESSAGES[res.error] })
    return { id: deps.store.addFile(ws, name, res.text), name, chars: res.text.length }
  })

  app.post<{ Body: { text?: unknown; fileIds?: unknown } }>('/api/requests', async (req, reply) => {
    const ws = visitor(req, reply)
    if (!ws) return reply
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : ''
    const fileIds = Array.isArray(req.body?.fileIds) ? req.body.fileIds.filter((x): x is string => typeof x === 'string').slice(0, 5) : []
    if (text.length < 10 || text.length > 4000) return reply.code(400).send({ error: 'bad request', message: 'Please describe the problem in 10 to 4,000 characters.' })
    if (mode() !== 'full') return notFull(reply)
    if (!take(reply, ws, 'programme')) return reply
    const jobId = deps.store.createJob(ws)
    void runRequestJob({ ...deps, hub }, ws, jobId, { text, fileIds: deps.store.files(ws, fileIds).map((f) => f.id) })
    return reply.code(202).send({ jobId })
  })

  app.get<{ Params: { id: string } }>('/api/jobs/:id/events', async (req, reply) => {
    const ws = visitor(req, reply)
    if (!ws) return reply
    const job = deps.store.job(ws, req.params.id)
    if (!job) return reply.code(404).send({ error: 'not found' })
    reply.hijack()
    const raw = reply.raw
    raw.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' })
    const send = (e: any) => raw.write(`data: ${JSON.stringify(e)}\n\n`)
    // Store writes and hub publishes are synchronous, so nothing can land between this replay and the subscription.
    const stored = job.events
    for (const e of stored) send(e)
    if (stored.some((e) => TERMINAL.has(e.type)) || job.status !== 'running') return void raw.end()
    const unsubscribe = hub.subscribe(job.id, (e) => {
      send(e)
      if (TERMINAL.has(e.type)) { unsubscribe(); raw.end() }
    })
    req.raw.on('close', unsubscribe)
  })

  app.get('/api/programmes', async (req, reply) => {
    const ws = visitor(req, reply)
    if (!ws) return reply
    return deps.store.listProgrammes(ws).map((p) => ({
      id: p.id,
      title: p.programme?.title ?? p.request.text.slice(0, 60),
      caseId: p.caseId,
      status: p.status,
      readyBuilt: p.readyBuilt,
      language: p.programme?.language ?? p.match?.language ?? null,
      ready: !!p.programme,
      latestVersionId: deps.store.versionsOf(p.id)[0]?.id ?? null,
    }))
  })

  app.get<{ Params: { id: string } }>('/api/programmes/:id', async (req, reply) => {
    const ws = visitor(req, reply)
    if (!ws) return reply
    const p = deps.store.programme(ws, req.params.id)
    if (!p) return reply.code(404).send({ error: 'not found' })
    return {
      id: p.id,
      caseId: p.caseId,
      request: p.request,
      match: p.match,
      programme: p.programme,
      brief: p.brief,
      files: deps.store.files(p.ws, p.request.fileIds).map((f) => ({ id: f.id, name: f.name })),
      status: p.status,
      mix: p.programme ? groundingMix(p.programme) : null,
      testCall: p.testCall,
      readyBuilt: p.readyBuilt,
      sampleCallId: p.readyBuilt && p.caseId && deps.store.call(LIBRARY, sampleCallId(p.caseId)) ? sampleCallId(p.caseId) : null,
      versions: deps.store.versionsOf(p.id),
    }
  })

  app.post<{ Params: { id: string }; Body: { instruction?: unknown } }>('/api/programmes/:id/edit', async (req, reply) => {
    const ws = visitor(req, reply)
    if (!ws) return reply
    const p = deps.store.programme(ws, req.params.id)
    if (!p) return reply.code(404).send({ error: 'not found' })
    if (p.ws !== ws) return reply.code(403).send({ error: 'forbidden', message: 'Ready-built programmes cannot be changed. Build your own to edit it.' })
    const instruction = typeof req.body?.instruction === 'string' ? req.body.instruction.trim().slice(0, MAX_INSTRUCTION) : ''
    if (!instruction || !p.programme || !p.brief) return reply.code(400).send({ error: 'bad request' })
    if (mode() !== 'full') return notFull(reply)
    if (!take(reply, ws, 'edit')) return reply
    const res = await editProgramme(deps.meta, { programme: p.programme, brief: p.brief, files: deps.store.files(ws, p.request.fileIds), instruction })
    if ('problems' in res) return reply.code(422).send(res)
    deps.store.saveProgramme(ws, p.id, { programme: res.programme, status: 'draft', testCall: null })
    return res
  })

  app.post<{ Params: { id: string } }>('/api/programmes/:id/publish', async (req, reply) => {
    const ws = visitor(req, reply)
    if (!ws) return reply
    const p = deps.store.programme(ws, req.params.id)
    if (!p) return reply.code(404).send({ error: 'not found' })
    if (p.ws !== ws) return reply.code(403).send({ error: 'forbidden' })
    if (!p.programme || !p.brief) return reply.code(400).send({ error: 'bad request', message: 'There is no programme to publish yet.' })
    return deps.store.publish(ws, p.id)
  })

  app.post<{ Params: { id: string } }>('/api/programmes/:id/test-call', async (req, reply) => {
    const ws = visitor(req, reply)
    if (!ws) return reply
    const p = deps.store.programme(ws, req.params.id)
    if (!p) return reply.code(404).send({ error: 'not found' })
    if (p.ws !== ws) return reply.code(403).send({ error: 'forbidden' })
    if (!p.programme) return reply.code(400).send({ error: 'bad request' })
    if (mode() !== 'full') return notFull(reply)
    if (!take(reply, ws, 'edit')) return reply
    const result = await runTestCall(deps.meta, p.programme)
    deps.store.saveProgramme(ws, p.id, { testCall: result })
    return result
  })

  app.post<{ Body: { versionId?: unknown; learner?: unknown; level?: unknown; mode?: unknown; drillLineId?: unknown } }>('/api/calls', async (req, reply) => {
    const ws = visitor(req, reply)
    if (!ws) return reply
    const b = req.body ?? {}
    const version = usableVersion(ws, b.versionId)
    if (!version) return reply.code(404).send({ error: 'not found' })
    const p = version.programme
    const level = p.levels.find((l) => l.id === b.level)
    const learner = typeof b.learner === 'string' ? b.learner.trim().slice(0, 40) : ''
    const callMode = b.mode === 'drill' ? 'drill' : 'full'
    const drillLine = callMode === 'drill' ? p.rubric.find((r) => r.id === b.drillLineId) : undefined
    if (!level || !learner || (callMode === 'drill' && !drillLine)) return reply.code(400).send({ error: 'bad request', message: 'Please type your name and pick a level.' })
    if (mode() === 'read_only') return reply.code(503).send({ error: 'busy', message: "Today's budget is used up. Calls open again at midnight UTC." })
    if (!take(reply, ws, 'call')) return reply
    const callId = deps.store.createCall(ws, { versionId: version.id, learner, level: level.id, mode: callMode, drillLineId: drillLine?.id ?? null, mood: level.moodStart }, now())
    const created = deps.store.call(ws, callId)!
    deps.store.saveCall(ws, callId, { turns: [{ speaker: 'persona', text: level.opening, atMs: 0, mood: level.moodStart }] })
    return {
      callId,
      opening: level.opening,
      mood: level.moodStart,
      persona: { name: p.persona.name, role: p.persona.role, voice: p.persona.voice },
      language: p.language,
      maxSeconds: maxSeconds(created),
      level: { id: level.id, title: level.title, situation: level.situation },
      instructions: p.instructions,
      learnerRole: p.learnerRole,
      drill: drillLine ? { lineId: drillLine.id, text: drillLine.text, tryThis: drillLine.tryThis } : null,
    }
  })

  app.post<{ Params: { id: string }; Body: { text?: unknown } }>('/api/calls/:id/turn', async (req, reply) => {
    const ws = visitor(req, reply)
    if (!ws) return reply
    const call = deps.store.call(ws, req.params.id)
    if (!call) return reply.code(404).send({ error: 'not found' })
    if (call.ended) return reply.code(409).send({ error: 'ended', message: 'This call has ended.' })
    const text = typeof req.body?.text === 'string' ? req.body.text.trim().slice(0, 1000) : ''
    if (!text) return reply.code(400).send({ error: 'bad request' })
    const version = deps.store.version(call.versionId)!
    const p = version.programme
    const level = p.levels.find((l) => l.id === call.level)!
    const startedAt = call.created
    const elapsed = now() - startedAt
    const turns = [...call.turns, { speaker: 'learner' as const, text, atMs: elapsed, mood: null }]
    if (elapsed > maxSeconds(call) * 1000 + GRACE_MS) {
      deps.store.saveCall(ws, call.id, { ended: now() })
      return { say: '', mood: call.mood, revealed: [], ended: true }
    }
    const drillLine = call.drillLineId ? p.rubric.find((r) => r.id === call.drillLineId) : undefined
    const out = await personaTurn(deps.meta, { programme: p, level, turns, revealed: call.revealed, mood: call.mood, drillLine })
    const applied = applyReply({ mood: call.mood, revealed: call.revealed }, out, level, p.persona)
    turns.push({ speaker: 'persona', text: applied.say, atMs: now() - startedAt, mood: applied.mood })
    const learnerTurns = turns.filter((t) => t.speaker === 'learner').length
    const ended = out.hangUp || learnerTurns >= MAX_LEARNER_TURNS || now() - startedAt >= maxSeconds(call) * 1000
    deps.store.saveCall(ws, call.id, { turns, mood: applied.mood, revealed: applied.revealed, ...(ended ? { ended: now() } : {}) })
    return { say: applied.say, mood: applied.mood, revealed: applied.newlyRevealed.map((id) => p.persona.facts.find((f) => f.id === id)!.fact), ended }
  })

  app.post<{ Params: { id: string } }>('/api/calls/:id/end', async (req, reply) => {
    const ws = visitor(req, reply)
    if (!ws) return reply
    const call = deps.store.call(ws, req.params.id)
    if (!call) return reply.code(404).send({ error: 'not found' })
    const version = deps.store.version(call.versionId)!
    if (!call.ended) deps.store.saveCall(ws, call.id, { ended: now() })
    if (call.verdicts) return { ...debriefOf(call, version), scoredFully: true }
    const { verdicts, complete } = await scoreCall({ meta: deps.meta, open: deps.open, store: deps.store }, scored(call, version), call.turns)
    // A judge that could not be reached leaves lines unsure; keep nothing, so the next /end scores again.
    if (complete) deps.store.saveCall(ws, call.id, { verdicts })
    return { ...debriefOf(call, version, verdicts), scoredFully: complete }
  })

  app.get<{ Params: { id: string } }>('/api/calls/:id', async (req, reply) => {
    const ws = visitor(req, reply)
    if (!ws) return reply
    // Ready-built programmes come with one sample call anyone may read.
    const sample = req.params.id.startsWith('lib-') ? deps.store.call(LIBRARY, req.params.id) : null
    const call = sample ?? deps.store.call(ws, req.params.id)
    if (!call) return reply.code(404).send({ error: 'not found' })
    const version = deps.store.version(call.versionId)!
    const p = version.programme
    return {
      id: call.id,
      learner: call.learner,
      level: call.level,
      mode: call.mode,
      versionId: call.versionId,
      programmeId: version.programmeId,
      title: p.title,
      persona: { name: p.persona.name, role: p.persona.role },
      language: p.language,
      turns: call.turns,
      ended: call.ended,
      sample: !!sample,
      debrief: debriefOf(call, version),
    }
  })

  app.post<{ Params: { id: string }; Body: { lineId?: unknown; result?: unknown } }>('/api/calls/:id/settle', async (req, reply) => {
    const ws = visitor(req, reply)
    if (!ws) return reply
    const call = deps.store.call(ws, req.params.id)
    if (!call) return reply.code(404).send({ error: 'not found' })
    const result = LineResultSchema.safeParse(req.body?.result)
    const verdict = call.verdicts?.find((v) => v.lineId === req.body?.lineId)
    if (!result.success || !verdict) return reply.code(400).send({ error: 'bad request' })
    if (verdict.result !== 'unsure') return reply.code(409).send({ error: 'not unsure', message: 'Only lines the judges disagreed on can be settled.' })
    deps.store.saveCall(ws, call.id, { verdicts: settle(call.verdicts!, verdict.lineId, result.data) })
    return debriefOf(deps.store.call(ws, call.id)!, deps.store.version(call.versionId)!)
  })

  app.get<{ Params: { id: string } }>('/api/versions/:id/report', async (req, reply) => {
    const ws = visitor(req, reply)
    if (!ws) return reply
    const version = usableVersion(ws, req.params.id)
    if (!version) return reply.code(404).send({ error: 'not found' })
    const live = deps.store
      .callsForVersion(ws, version.id)
      .filter((c) => c.verdicts)
      .map((c) => ({ learner: c.learner, created: c.created, mode: c.mode, verdicts: c.verdicts!, sample: false }))
    const sample = version.ws === LIBRARY ? sampleTeam(version.programme, version.hash) : []
    return {
      title: version.programme.title,
      programmeId: version.programmeId,
      hash: version.hash,
      published: version.published,
      report: teamReport(version.programme, [...sample, ...live]),
    }
  })

  app.post<{ Body: { versionId?: unknown } }>('/api/portrait', async (req, reply) => {
    const ws = visitor(req, reply)
    if (!ws) return reply
    const version = usableVersion(ws, req.body?.versionId)
    if (!version) return reply.code(404).send({ error: 'not found' })
    const cached = portraits.get(version.hash)
    if (cached) return { url: cached }
    if (!deps.images || mode() === 'read_only') return reply.code(503).send({ error: 'unavailable' })
    const prompt = `Warm illustrated portrait, head and shoulders, of a fictional person: ${version.programme.persona.portraitPrompt}. Soft natural light, plain muted background, editorial illustration style. Not a real person. No text, no letters, no logos.`
    try {
      const res = await deps.images.generate({ model: 'muse-image-1.0', prompt, n: 1, reasoning_strength: 'low' }, { timeout: 40_000 })
      const b64 = res?.data?.[0]?.b64_json
      if (!b64) return reply.code(503).send({ error: 'unavailable' })
      deps.budget?.add(0.01)
      const url = `data:image/webp;base64,${b64}`
      portraits.set(version.hash, url)
      return { url }
    } catch {
      return reply.code(503).send({ error: 'unavailable' })
    }
  })

  app.post<{ Body: { voice?: unknown; text?: unknown } }>('/api/tts', async (req, reply) => {
    const ws = visitor(req, reply)
    if (!ws) return reply
    const voice = VoiceIdSchema.safeParse(req.body?.voice)
    const text = req.body?.text
    if (!voice.success || typeof text !== 'string' || !text.trim() || text.length > MAX_TTS_CHARS) return reply.code(400).send({ error: 'bad request' })
    if (mode() === 'read_only' || !deps.tts) return reply.code(503).send({ error: 'voice unavailable' })
    const audio = await synthesize(deps.tts, voice.data, text).catch(() => null)
    if (!audio) return reply.code(503).send({ error: 'voice unavailable' })
    deps.budget?.add(text.length * PRICES.ttsPerChar)
    return reply.type('audio/mpeg').send(Buffer.from(audio))
  })

  /** One utterance per socket. In a call the language and keywords come from the call's frozen version; otherwise from ?lang=. */
  app.register(async (scoped) => {
    scoped.get('/ws/stt', { websocket: true }, (socket, req) => {
      const q = req.query as Record<string, string | undefined>
      const ws = q.v && VISITOR.test(q.v) ? q.v : null
      if (!deps.stt || !ws || mode() === 'read_only') return socket.close()
      let opts: { language: Language; keywords: string[] } = { language: LanguageSchema.catch('en').parse(q.lang), keywords: [] }
      if (q.callId) {
        const call = deps.store.call(ws, q.callId)
        const version = call && deps.store.version(call.versionId)
        if (!version) return socket.close()
        opts = { language: version.programme.language, keywords: version.programme.keywords }
      }
      // 24 kHz 16-bit mono = 48,000 bytes per second of speech
      socket.on('message', (data: Buffer, isBinary: boolean) => {
        if (isBinary) deps.budget?.add((data.length / 48000) * PRICES.sttPerSecond)
      })
      bridgeStt(socket as unknown as SocketLike, deps.stt.connect, deps.stt.apiKey, opts)
    })
  })

  return Object.assign(app, { hub, mode })
}
