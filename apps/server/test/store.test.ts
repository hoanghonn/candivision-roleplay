import { describe, expect, it } from 'vitest'
import { openStore, versionHash } from '../src/store'
import { outageBrief, outageProgramme } from '../../../packages/core/test/fixtures/outage'

function draft(store: ReturnType<typeof openStore>, ws: string) {
  const id = store.createProgramme(ws, { text: 'Our engineers make outage calls worse', fileIds: [] })
  store.saveProgramme(ws, id, { programme: outageProgramme, brief: outageBrief, caseId: 'outage_call' })
  return id
}

describe('store', () => {
  it("a visitor never sees another visitor's programme", () => {
    const store = openStore(':memory:')
    const id = draft(store, 'a')
    expect(store.programme('a', id)?.programme?.title).toBe('The outage call')
    expect(store.programme('b', id)).toBeNull()
    expect(store.listProgrammes('b')).toEqual([])
  })

  it('library programmes are listed for everyone with readyBuilt', () => {
    const store = openStore(':memory:')
    const id = draft(store, 'library')
    const list = store.listProgrammes('b')
    expect(list.map((p) => p.id)).toEqual([id])
    expect(list[0].readyBuilt).toBe(true)
    expect(store.programme('b', id)?.readyBuilt).toBe(true)
  })

  it('publish freezes a version', () => {
    const store = openStore(':memory:')
    const id = draft(store, 'a')
    const { versionId, hash } = store.publish('a', id)
    expect(hash).toMatch(/^[0-9a-f]{12}$/)
    store.saveProgramme('a', id, { programme: { ...outageProgramme, title: 'Changed' } })
    expect(store.version(versionId)?.programme.title).toBe('The outage call')
    expect(store.programme('a', id)?.status).toBe('published')
  })

  it('files are scoped to the workspace', () => {
    const store = openStore(':memory:')
    const f = store.addFile('a', 'thread.txt', 'hello there')
    expect(store.files('a', [f])).toEqual([{ id: f, name: 'thread.txt', text: 'hello there' }])
    expect(store.files('b', [f])).toEqual([])
  })

  it('job events are stored in order', () => {
    const store = openStore(':memory:')
    const j = store.createJob('a')
    store.pushJobEvent(j, { type: 'searching', query: 'x' })
    store.pushJobEvent(j, { type: 'done', programmeId: 'p' })
    store.finishJob(j, 'done', 'p')
    expect(store.job('a', j)?.events.map((e: any) => e.type)).toEqual(['searching', 'done'])
    expect(store.job('b', j)).toBeNull()
  })

  it('calls are stored in the caller workspace and listed per version', () => {
    const store = openStore(':memory:')
    const pid = draft(store, 'library')
    const { versionId } = store.publish('library', pid)
    const c = store.createCall('b', { versionId, learner: 'Linh', level: 'L1', mode: 'full', drillLineId: null, mood: 40 })
    store.saveCall('b', c, { turns: [{ speaker: 'learner', text: 'hi', atMs: 0, mood: null }] })
    expect(store.call('b', c)?.turns).toHaveLength(1)
    expect(store.call('a', c)).toBeNull()
    expect(store.callsForVersion('b', versionId)).toHaveLength(1)
    expect(store.callsForVersion('a', versionId)).toHaveLength(0)
  })

  it('verdicts are cached by version hash and transcript hash', () => {
    const store = openStore(':memory:')
    expect(store.cachedVerdicts('v', 't')).toBeNull()
    store.cacheVerdicts('v', 't', [])
    expect(store.cachedVerdicts('v', 't')).toEqual([])
  })
})

describe('versionHash', () => {
  it('is stable under key order', () => {
    const reordered = JSON.parse(JSON.stringify(outageProgramme, Object.keys(outageProgramme).reverse()))
    expect(versionHash({ ...reordered, ...outageProgramme }, outageBrief)).toBe(versionHash(outageProgramme, outageBrief))
    const flipped = Object.fromEntries(Object.entries(outageProgramme).reverse()) as typeof outageProgramme
    expect(versionHash(flipped, outageBrief)).toBe(versionHash(outageProgramme, outageBrief))
    expect(versionHash({ ...outageProgramme, title: 'x' }, outageBrief)).not.toBe(versionHash(outageProgramme, outageBrief))
  })
})
