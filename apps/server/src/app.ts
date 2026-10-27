import multipart from '@fastify/multipart'
import websocket from '@fastify/websocket'
import { groundingMix } from '@roleplay/core'
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify'
import { editProgramme, MAX_INSTRUCTION } from './builder'
import { extractText, MAX_FILE_BYTES, type IntakeError } from './intake'
import { JobHub, runRequestJob, TERMINAL } from './jobs'
import { siteMode, type LimitKind, type VisitorLimits } from './limits'
import type { ChatClient } from './llm'
import type { Paper } from './papers'
import type { Store } from './store'
import type { Budget } from './usage'

export type Deps = {
  store: Store
  limits?: VisitorLimits
  budget?: Budget
  dailyUsd: number
  meta: ChatClient
  /** Muse Spark Open on Baseten, for judge 2; null falls back to a second Muse Spark pass */
  open: ChatClient | null
  searchPapers: (q: string) => Promise<Paper[]>
  doiResolves: (doi: string) => Promise<boolean>
}

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

  return Object.assign(app, { hub, mode })
}
