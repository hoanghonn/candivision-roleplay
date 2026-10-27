import { createHash, randomUUID } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { ProgrammeSchema, ResearchBriefSchema, type CaseId, type CaseMatch, type FileText, type Programme, type ResearchBrief, type Turn, type Verdict } from '@roleplay/core'

// Every row belongs to a workspace (the visitor id). Customer files and learner names stay here and are never logged.

export const LIBRARY = 'library'

export type RequestInput = { text: string; fileIds: string[] }
export type TestCall = { ok: boolean; notes: string[] }
export type ProgrammeRow = {
  id: string
  ws: string
  status: 'draft' | 'published'
  caseId: CaseId | null
  request: RequestInput
  match: CaseMatch | null
  brief: ResearchBrief | null
  programme: Programme | null
  testCall: TestCall | null
  created: number
  updated: number
  readyBuilt: boolean
}
export type VersionRow = { id: string; programmeId: string; ws: string; hash: string; programme: Programme; brief: ResearchBrief; published: number }
export type JobRow = { id: string; ws: string; status: 'running' | 'done' | 'failed'; events: any[]; programmeId: string | null }
export type CallInput = { versionId: string; learner: string; level: string; mode: 'full' | 'drill'; drillLineId: string | null; mood: number }
export type CallRow = CallInput & { id: string; ws: string; turns: Turn[]; revealed: string[]; verdicts: Verdict[] | null; created: number; ended: number | null }

/** Canonical JSON (keys sorted) so the hash does not depend on key order. */
function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`
  if (v && typeof v === 'object') return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical((v as any)[k])}`).join(',')}}`
  return JSON.stringify(v)
}

export const sha = (s: string) => createHash('sha256').update(s).digest('hex')
export const versionHash = (programme: Programme, brief: ResearchBrief) => sha(canonical({ programme, brief })).slice(0, 12)
export const transcriptHash = (turns: Turn[]) => sha(canonical(turns)).slice(0, 16)

const parse = (s: string | null) => (s == null ? null : JSON.parse(s))

export function openStore(path: string) {
  const db = new DatabaseSync(path)
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS files (id TEXT PRIMARY KEY, ws TEXT NOT NULL, name TEXT NOT NULL, text TEXT NOT NULL, created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS programmes (id TEXT PRIMARY KEY, ws TEXT NOT NULL, status TEXT NOT NULL, case_id TEXT, request_json TEXT NOT NULL,
      match_json TEXT, brief_json TEXT, programme_json TEXT, test_call_json TEXT, created INTEGER NOT NULL, updated INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS versions (id TEXT PRIMARY KEY, programme_id TEXT NOT NULL, ws TEXT NOT NULL, hash TEXT NOT NULL,
      programme_json TEXT NOT NULL, brief_json TEXT NOT NULL, published INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, ws TEXT NOT NULL, status TEXT NOT NULL, events_json TEXT NOT NULL, programme_id TEXT);
    CREATE TABLE IF NOT EXISTS calls (id TEXT PRIMARY KEY, ws TEXT NOT NULL, version_id TEXT NOT NULL, learner TEXT NOT NULL, level TEXT NOT NULL,
      mode TEXT NOT NULL, drill_line_id TEXT, mood REAL NOT NULL, turns_json TEXT NOT NULL, revealed_json TEXT NOT NULL, verdicts_json TEXT,
      created INTEGER NOT NULL, ended INTEGER);
    CREATE TABLE IF NOT EXISTS verdict_cache (version_hash TEXT NOT NULL, transcript_hash TEXT NOT NULL, verdicts_json TEXT NOT NULL,
      PRIMARY KEY (version_hash, transcript_hash));
  `)

  const toProgramme = (r: any): ProgrammeRow => ({
    id: r.id,
    ws: r.ws,
    status: r.status,
    caseId: r.case_id,
    request: JSON.parse(r.request_json),
    match: parse(r.match_json),
    brief: r.brief_json ? ResearchBriefSchema.parse(JSON.parse(r.brief_json)) : null,
    programme: r.programme_json ? ProgrammeSchema.parse(JSON.parse(r.programme_json)) : null,
    testCall: parse(r.test_call_json),
    created: r.created,
    updated: r.updated,
    readyBuilt: r.ws === LIBRARY,
  })
  const toVersion = (r: any): VersionRow => ({
    id: r.id,
    programmeId: r.programme_id,
    ws: r.ws,
    hash: r.hash,
    programme: ProgrammeSchema.parse(JSON.parse(r.programme_json)),
    brief: ResearchBriefSchema.parse(JSON.parse(r.brief_json)),
    published: r.published,
  })
  const toCall = (r: any): CallRow => ({
    id: r.id,
    ws: r.ws,
    versionId: r.version_id,
    learner: r.learner,
    level: r.level,
    mode: r.mode,
    drillLineId: r.drill_line_id,
    mood: r.mood,
    turns: JSON.parse(r.turns_json),
    revealed: JSON.parse(r.revealed_json),
    verdicts: parse(r.verdicts_json),
    created: r.created,
    ended: r.ended,
  })

  return {
    addFile(ws: string, name: string, text: string): string {
      const id = randomUUID()
      db.prepare('INSERT INTO files VALUES (?, ?, ?, ?, ?)').run(id, ws, name, text, Date.now())
      return id
    },
    files(ws: string, ids: string[]): FileText[] {
      if (ids.length === 0) return []
      const rows = db.prepare(`SELECT id, name, text FROM files WHERE ws = ? AND id IN (${ids.map(() => '?').join(',')})`).all(ws, ...ids) as any[]
      return ids.flatMap((id) => rows.filter((r) => r.id === id).map((r) => ({ id: r.id, name: r.name, text: r.text })))
    },

    createProgramme(ws: string, request: RequestInput): string {
      const id = randomUUID()
      const now = Date.now()
      db.prepare('INSERT INTO programmes (id, ws, status, request_json, created, updated) VALUES (?, ?, ?, ?, ?, ?)').run(id, ws, 'draft', JSON.stringify(request), now, now)
      return id
    },
    saveProgramme(ws: string, id: string, patch: Partial<Pick<ProgrammeRow, 'caseId' | 'match' | 'brief' | 'programme' | 'testCall' | 'status'>>): void {
      const cols: Record<string, string> = { caseId: 'case_id', match: 'match_json', brief: 'brief_json', programme: 'programme_json', testCall: 'test_call_json', status: 'status' }
      const sets: string[] = []
      const vals: any[] = []
      for (const [k, v] of Object.entries(patch)) {
        sets.push(`${cols[k]} = ?`)
        vals.push(k === 'caseId' || k === 'status' ? v : JSON.stringify(v))
      }
      sets.push('updated = ?')
      vals.push(Date.now())
      db.prepare(`UPDATE programmes SET ${sets.join(', ')} WHERE id = ? AND ws = ?`).run(...vals, id, ws)
    },
    /** Own programmes and ready-built ones; never another visitor's. */
    programme(ws: string, id: string): ProgrammeRow | null {
      const r = db.prepare('SELECT * FROM programmes WHERE id = ? AND (ws = ? OR ws = ?)').get(id, ws, LIBRARY)
      return r ? toProgramme(r) : null
    },
    listProgrammes(ws: string): ProgrammeRow[] {
      const rows = db.prepare('SELECT * FROM programmes WHERE ws = ? OR ws = ? ORDER BY (ws = ?) DESC, created DESC').all(ws, LIBRARY, LIBRARY) as any[]
      return rows.map(toProgramme)
    },
    publish(ws: string, id: string): { versionId: string; hash: string } {
      const p = this.programme(ws, id)
      if (!p || p.ws !== ws || !p.programme || !p.brief) throw new Error('nothing to publish')
      const hash = versionHash(p.programme, p.brief)
      const existing = db.prepare('SELECT id FROM versions WHERE programme_id = ? AND hash = ?').get(id, hash) as any
      if (existing) return { versionId: existing.id, hash }
      const versionId = randomUUID()
      db.prepare('INSERT INTO versions VALUES (?, ?, ?, ?, ?, ?, ?)').run(versionId, id, ws, hash, JSON.stringify(p.programme), JSON.stringify(p.brief), Date.now())
      this.saveProgramme(ws, id, { status: 'published' })
      return { versionId, hash }
    },
    /** Versions are read-only and readable by anyone who has the id. */
    version(id: string): VersionRow | null {
      const r = db.prepare('SELECT * FROM versions WHERE id = ?').get(id)
      return r ? toVersion(r) : null
    },
    versionsOf(programmeId: string): { id: string; hash: string; published: number }[] {
      return db.prepare('SELECT id, hash, published FROM versions WHERE programme_id = ? ORDER BY published DESC').all(programmeId) as any[]
    },

    createJob(ws: string): string {
      const id = randomUUID()
      db.prepare('INSERT INTO jobs VALUES (?, ?, ?, ?, ?)').run(id, ws, 'running', '[]', null)
      return id
    },
    pushJobEvent(id: string, event: unknown): void {
      const r = db.prepare('SELECT events_json FROM jobs WHERE id = ?').get(id) as any
      if (!r) return
      db.prepare('UPDATE jobs SET events_json = ? WHERE id = ?').run(JSON.stringify([...JSON.parse(r.events_json), event]), id)
    },
    finishJob(id: string, status: 'done' | 'failed', programmeId: string | null = null): void {
      db.prepare('UPDATE jobs SET status = ?, programme_id = ? WHERE id = ?').run(status, programmeId, id)
    },
    job(ws: string, id: string): JobRow | null {
      const r = db.prepare('SELECT * FROM jobs WHERE id = ? AND ws = ?').get(id, ws) as any
      return r ? { id: r.id, ws: r.ws, status: r.status, events: JSON.parse(r.events_json), programmeId: r.programme_id } : null
    },

    createCall(ws: string, c: CallInput): string {
      const id = randomUUID()
      db.prepare('INSERT INTO calls (id, ws, version_id, learner, level, mode, drill_line_id, mood, turns_json, revealed_json, created) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(id, ws, c.versionId, c.learner, c.level, c.mode, c.drillLineId, c.mood, '[]', '[]', Date.now())
      return id
    },
    saveCall(ws: string, id: string, patch: Partial<Pick<CallRow, 'turns' | 'revealed' | 'verdicts' | 'mood' | 'ended'>>): void {
      const cols: Record<string, string> = { turns: 'turns_json', revealed: 'revealed_json', verdicts: 'verdicts_json', mood: 'mood', ended: 'ended' }
      const entries = Object.entries(patch)
      if (!entries.length) return
      db.prepare(`UPDATE calls SET ${entries.map(([k]) => `${cols[k]} = ?`).join(', ')} WHERE id = ? AND ws = ?`)
        .run(...entries.map(([k, v]) => (k === 'mood' || k === 'ended' ? (v as any) : JSON.stringify(v))), id, ws)
    },
    call(ws: string, id: string): CallRow | null {
      const r = db.prepare('SELECT * FROM calls WHERE id = ? AND ws = ?').get(id, ws)
      return r ? toCall(r) : null
    },
    callsForVersion(ws: string, versionId: string): CallRow[] {
      return (db.prepare('SELECT * FROM calls WHERE ws = ? AND version_id = ? ORDER BY created').all(ws, versionId) as any[]).map(toCall)
    },

    cachedVerdicts(versionHash: string, transcriptHash: string): Verdict[] | null {
      const r = db.prepare('SELECT verdicts_json FROM verdict_cache WHERE version_hash = ? AND transcript_hash = ?').get(versionHash, transcriptHash) as any
      return r ? JSON.parse(r.verdicts_json) : null
    },
    cacheVerdicts(versionHash: string, transcriptHash: string, verdicts: Verdict[]): void {
      db.prepare('INSERT OR REPLACE INTO verdict_cache VALUES (?, ?, ?)').run(versionHash, transcriptHash, JSON.stringify(verdicts))
    },
  }
}

export type Store = ReturnType<typeof openStore>
