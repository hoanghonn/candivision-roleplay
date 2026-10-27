import { describe, expect, it } from 'vitest'
import { buildApp, type Deps } from '../src/app'
import { VisitorLimits } from '../src/limits'
import { LIBRARY, openStore } from '../src/store'
import { Budget } from '../src/usage'
import { outageBrief, outageProgramme as withExcerpts } from '../../../packages/core/test/fixtures/outage'

// These tests upload no customer files, so the programme must not quote one.
const outageProgramme = { ...withExcerpts, skills: withExcerpts.skills.map((s) => ({ ...s, excerpts: [] })) }
import { scripted, toolCall, tinyPdf } from './helpers'

const A = 'aaaaaaaa-0000-0000-0000-000000000001'
const B = 'bbbbbbbb-0000-0000-0000-000000000002'
const match = { caseId: 'outage_call', situation: 'Outage call', learnerRole: 'Engineer', counterpartRole: 'Client', language: 'en', stakes: 'Escalations', readyMeans: [] }

/** The replies a full request job needs: case match, one research round, the programme. */
const happyReplies = () => [
  JSON.stringify(match),
  toolCall('submit_brief', { items: [{ sourceId: 'M:apology-structure', gives: 'Own it.', use: 'handle' }], notFound: [] }),
  JSON.stringify(outageProgramme),
]

function setup(over: Partial<Deps> = {}, replies: any[] = happyReplies()) {
  const store = openStore(':memory:')
  const meta = scripted(replies)
  const app = buildApp({ store, dailyUsd: 10, meta, open: null, searchPapers: async () => [], doiResolves: async () => true, ...over })
  return { app, store, meta }
}

async function waitForJob(store: ReturnType<typeof openStore>, ws: string, id: string) {
  for (let i = 0; i < 200; i++) {
    if (store.job(ws, id)?.status !== 'running') return
    await new Promise((r) => setTimeout(r, 5))
  }
  throw new Error('job did not finish')
}

function seedLibrary(store: ReturnType<typeof openStore>) {
  const id = store.createProgramme(LIBRARY, { text: 'outage', fileIds: [] })
  store.saveProgramme(LIBRARY, id, { programme: outageProgramme, brief: outageBrief, caseId: 'outage_call' })
  return id
}

const sse = (body: string) => body.split('\n\n').filter((b) => b.startsWith('data: ')).map((b) => JSON.parse(b.slice(6)))

describe('visitor id', () => {
  it('missing visitor id is 400', async () => {
    const { app } = setup()
    expect((await app.inject({ method: 'GET', url: '/api/programmes' })).statusCode).toBe(400)
  })
  it('status needs no visitor id', async () => {
    const { app } = setup()
    expect((await app.inject({ method: 'GET', url: '/api/status' })).json()).toEqual({ mode: 'full' })
  })
})

describe('POST /api/requests', () => {
  it('request job streams matched, candidate, done in order', async () => {
    const { app, store } = setup()
    const res = await app.inject({ method: 'POST', url: '/api/requests', headers: { 'x-visitor-id': A }, payload: { text: 'Our engineers make outage calls worse', fileIds: [] } })
    expect(res.statusCode).toBe(202)
    const { jobId } = res.json()
    await waitForJob(store, A, jobId)
    const events = sse((await app.inject({ method: 'GET', url: `/api/jobs/${jobId}/events?v=${A}` })).body)
    const types = events.map((e) => e.type)
    expect(types.indexOf('matched')).toBeLessThan(types.indexOf('candidate'))
    expect(types.indexOf('candidate')).toBeLessThan(types.indexOf('building'))
    expect(types.at(-1)).toBe('done')
    const programmeId = events.at(-1).programmeId
    const p = await app.inject({ method: 'GET', url: `/api/programmes/${programmeId}`, headers: { 'x-visitor-id': A } })
    expect(p.json()).toMatchObject({ status: 'draft', mix: 'research', readyBuilt: false })
    expect(p.json().programme.title).toBe('The outage call')
  })

  it('screening request ends with declined and creates no programme', async () => {
    const { app, store } = setup({}, [JSON.stringify({ declined: 'screening', reason: 'This ranks candidates.' })])
    const { jobId } = (await app.inject({ method: 'POST', url: '/api/requests', headers: { 'x-visitor-id': A }, payload: { text: 'Rank these candidates for me please', fileIds: [] } })).json()
    await waitForJob(store, A, jobId)
    expect(store.job(A, jobId)?.events.at(-1)).toEqual({ type: 'declined', reason: 'This ranks candidates.' })
    expect(store.listProgrammes(A)).toEqual([])
  })

  it('a model failure ends the job with a plain failed message', async () => {
    const { app, store } = setup({}, [new Error('500'), new Error('500')])
    const { jobId } = (await app.inject({ method: 'POST', url: '/api/requests', headers: { 'x-visitor-id': A }, payload: { text: 'Our engineers make outage calls worse', fileIds: [] } })).json()
    await waitForJob(store, A, jobId)
    expect(store.job(A, jobId)?.events.at(-1)).toMatchObject({ type: 'failed' })
  })

  it('fourth request today is 429', async () => {
    const { app } = setup({ limits: new VisitorLimits({ programmes: 3, edits: 10, calls: 10 }) }, [])
    const send = () => app.inject({ method: 'POST', url: '/api/requests', headers: { 'x-visitor-id': A }, payload: { text: 'Our engineers make outage calls worse', fileIds: [] } })
    for (let i = 0; i < 3; i++) await send()
    expect((await send()).statusCode).toBe(429)
  })

  it('calls_only mode refuses new requests with 503', async () => {
    const budget = new Budget({ dailyUsd: 10 })
    budget.add(8.5)
    const { app } = setup({ budget }, [])
    const res = await app.inject({ method: 'POST', url: '/api/requests', headers: { 'x-visitor-id': A }, payload: { text: 'Our engineers make outage calls worse', fileIds: [] } })
    expect(res.statusCode).toBe(503)
  })

  it('rejects a too-short request with 400', async () => {
    const { app } = setup({}, [])
    expect((await app.inject({ method: 'POST', url: '/api/requests', headers: { 'x-visitor-id': A }, payload: { text: 'short', fileIds: [] } })).statusCode).toBe(400)
  })
})

describe('programmes', () => {
  it("visitor B gets 404 for visitor A's programme", async () => {
    const { app, store } = setup()
    const id = store.createProgramme(A, { text: 'x', fileIds: [] })
    expect((await app.inject({ method: 'GET', url: `/api/programmes/${id}`, headers: { 'x-visitor-id': B } })).statusCode).toBe(404)
  })

  it('lists ready-built programmes for everyone', async () => {
    const { app, store } = setup()
    seedLibrary(store)
    const list = (await app.inject({ method: 'GET', url: '/api/programmes', headers: { 'x-visitor-id': B } })).json()
    expect(list).toEqual([expect.objectContaining({ title: 'The outage call', readyBuilt: true, language: 'en', caseId: 'outage_call' })])
  })

  it('edit on a library programme is 403', async () => {
    const { app, store } = setup()
    const id = seedLibrary(store)
    const res = await app.inject({ method: 'POST', url: `/api/programmes/${id}/edit`, headers: { 'x-visitor-id': B }, payload: { instruction: 'make it harder' } })
    expect(res.statusCode).toBe(403)
  })

  it('edit returns 422 with problems when the change drops the sources', async () => {
    const stripped = { ...outageProgramme, rubric: outageProgramme.rubric.map((r) => ({ ...r, sources: [], excerpts: [] })) }
    const { app, store } = setup({}, [JSON.stringify({ programme: stripped, changes: [] })])
    const id = store.createProgramme(A, { text: 'x', fileIds: [] })
    store.saveProgramme(A, id, { programme: outageProgramme, brief: outageBrief })
    const res = await app.inject({ method: 'POST', url: `/api/programmes/${id}/edit`, headers: { 'x-visitor-id': A }, payload: { instruction: 'drop the sources' } })
    expect(res.statusCode).toBe(422)
    expect(res.json().problems[0].message).toMatch(/no source/)
  })

  it('publish returns a 12-char hash', async () => {
    const { app, store } = setup()
    const id = store.createProgramme(A, { text: 'x', fileIds: [] })
    store.saveProgramme(A, id, { programme: outageProgramme, brief: outageBrief })
    const res = await app.inject({ method: 'POST', url: `/api/programmes/${id}/publish`, headers: { 'x-visitor-id': A } })
    expect(res.json().hash).toMatch(/^[0-9a-f]{12}$/)
    const p = (await app.inject({ method: 'GET', url: `/api/programmes/${id}`, headers: { 'x-visitor-id': A } })).json()
    expect(p.versions).toHaveLength(1)
  })
})

describe('POST /api/files', () => {
  const upload = (name: string, body: Buffer) => {
    const boundary = '----x'
    const payload = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${name}"\r\nContent-Type: application/octet-stream\r\n\r\n`),
      body,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ])
    return { method: 'POST' as const, url: '/api/files', headers: { 'x-visitor-id': A, 'content-type': `multipart/form-data; boundary=${boundary}` }, payload }
  }

  it('stores a text file in the workspace', async () => {
    const { app, store } = setup()
    const res = await app.inject(upload('thread.txt', Buffer.from('From Tanaka: the warehouse stopped for two hours this morning.')))
    expect(res.statusCode).toBe(200)
    expect(store.files(A, [res.json().id])[0].name).toBe('thread.txt')
  })

  it('explains a scanned PDF in plain words', async () => {
    const { app } = setup()
    const res = await app.inject(upload('scan.pdf', tinyPdf()))
    expect(res.statusCode).toBe(400)
    expect(res.json()).toMatchObject({ error: 'no_text', message: expect.stringMatching(/scanned/) })
  })
})
