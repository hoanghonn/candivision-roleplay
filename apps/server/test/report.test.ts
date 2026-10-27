import { describe, expect, it } from 'vitest'
import { buildApp } from '../src/app'
import { sampleTeam } from '../src/sample'
import { LIBRARY, openStore } from '../src/store'
import { outageBrief, outageProgramme as withExcerpts } from '../../../packages/core/test/fixtures/outage'
import { scripted } from './helpers'

const outageProgramme = { ...withExcerpts, skills: withExcerpts.skills.map((s) => ({ ...s, excerpts: [] })) }
const A = 'aaaaaaaa-0000-0000-0000-000000000001'

describe('sampleTeam', () => {
  it('is 12 made-up learners with a first and a latest call each, the same every time', () => {
    const team = sampleTeam(outageProgramme, 'abc123abc123')
    expect(new Set(team.map((c) => c.learner)).size).toBe(12)
    expect(team).toHaveLength(24)
    expect(team.every((c) => c.sample && c.mode === 'full' && /^Learner \d\d$/.test(c.learner))).toBe(true)
    expect(sampleTeam(outageProgramme, 'abc123abc123')).toEqual(team)
  })
})

describe('GET /api/versions/:id/report', () => {
  function setup(ws: string) {
    const store = openStore(':memory:')
    const app = buildApp({ store, dailyUsd: 10, meta: scripted([]), open: null, searchPapers: async () => [], doiResolves: async () => true })
    const pid = store.createProgramme(ws, { text: 'x', fileIds: [] })
    store.saveProgramme(ws, pid, { programme: outageProgramme, brief: outageBrief })
    return { app, store, ...store.publish(ws, pid) }
  }

  it('a ready-built version includes the labelled sample team plus my live calls', async () => {
    const { app, store, versionId } = setup(LIBRARY)
    const c = store.createCall(A, { versionId, learner: 'Linh', level: 'L1', mode: 'full', drillLineId: null, mood: 40 })
    store.saveCall(A, c, { verdicts: outageProgramme.rubric.map((r) => ({ lineId: r.id, result: 'pass' as const, readings: [null, null] as [null, null], judge2: 'baseten' as const, settled: null })) })
    const res = (await app.inject({ method: 'GET', url: `/api/versions/${versionId}/report`, headers: { 'x-visitor-id': A } })).json()
    expect(res.report.hasSample).toBe(true)
    expect(res.report.learners).toBe(13)
    expect(res.report.people[0]).toMatchObject({ learner: 'Linh', sample: false, status: 'passed' })
    expect(res).toMatchObject({ title: 'The outage call', hash: expect.stringMatching(/^[0-9a-f]{12}$/) })
  })

  it('my own version has no sample team', async () => {
    const { app, versionId } = setup(A)
    const res = (await app.inject({ method: 'GET', url: `/api/versions/${versionId}/report`, headers: { 'x-visitor-id': A } })).json()
    expect(res.report.hasSample).toBe(false)
    expect(res.report.learners).toBe(0)
  })

  it("someone else's version is 404", async () => {
    const { app, versionId } = setup(A)
    expect((await app.inject({ method: 'GET', url: `/api/versions/${versionId}/report`, headers: { 'x-visitor-id': 'bbbbbbbb-0000' } })).statusCode).toBe(404)
  })
})
