import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { CaseMatchSchema, ProgrammeSchema, ResearchBriefSchema, TurnSchema, VerdictSchema, type CaseId, type FileText } from '@roleplay/core'
import { z } from 'zod'
import { LIBRARY, type Store } from './store'

export const SEED_DIR = fileURLToPath(new URL('../seeds/library/', import.meta.url))

/** A ready-built programme made by the real pipeline (scripts/build-library.ts) and committed as JSON. */
export const SeedSchema = z.object({
  caseId: z.string(),
  request: z.string(),
  files: z.array(z.object({ id: z.string(), name: z.string(), text: z.string() })),
  match: CaseMatchSchema,
  brief: ResearchBriefSchema,
  programme: ProgrammeSchema,
  testCall: z.object({ ok: z.boolean(), notes: z.array(z.string()) }),
  sampleCall: z.object({ level: z.string(), learner: z.string(), turns: z.array(TurnSchema), verdicts: z.array(VerdictSchema) }),
})
export type Seed = z.infer<typeof SeedSchema>

export function readSeeds(dir: string): Seed[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => SeedSchema.parse(JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'))))
}

export const libraryId = (caseId: string) => `lib-${caseId}`
export const sampleCallId = (caseId: string) => `lib-${caseId}-sample`

/** Loads every seed into the shared library workspace and publishes it; safe to run on every boot. */
export function loadLibrary(store: Store, seeds: Seed[]): void {
  for (const s of seeds) {
    const id = libraryId(s.caseId)
    for (const f of s.files as FileText[]) store.addFile(LIBRARY, f.name, f.text, f.id)
    if (!store.programme(LIBRARY, id)) store.createProgramme(LIBRARY, { text: s.request, fileIds: s.files.map((f) => f.id) }, id)
    store.saveProgramme(LIBRARY, id, { caseId: s.caseId as CaseId, match: s.match, brief: s.brief, programme: s.programme, testCall: s.testCall })
    const { versionId } = store.publish(LIBRARY, id)
    const callId = sampleCallId(s.caseId)
    const existing = store.call(LIBRARY, callId)
    if (existing && existing.versionId === versionId) continue
    store.deleteCall(LIBRARY, callId)
    const level = s.programme.levels.find((l) => l.id === s.sampleCall.level) ?? s.programme.levels[0]
    store.createCall(LIBRARY, { versionId, learner: s.sampleCall.learner, level: level.id, mode: 'full', drillLineId: null, mood: level.moodStart }, 0, callId)
    store.saveCall(LIBRARY, callId, { turns: s.sampleCall.turns, verdicts: s.sampleCall.verdicts, ended: 1 })
  }
}
