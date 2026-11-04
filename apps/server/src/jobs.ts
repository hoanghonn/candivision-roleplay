import { buildProgramme } from './builder'
import { matchCase } from './intake'
import type { ChatClient } from './llm'
import type { Paper } from './papers'
import { runResearch } from './research'
import type { RequestInput, Store } from './store'
import { clip, type LogEvent } from './events'

export const TERMINAL = new Set(['done', 'declined', 'questions', 'failed'])

/** Live listeners per job; stored events are replayed from the database first. */
export class JobHub {
  private subs = new Map<string, Set<(e: any) => void>>()
  subscribe(jobId: string, fn: (e: any) => void): () => void {
    const set = this.subs.get(jobId) ?? new Set()
    set.add(fn)
    this.subs.set(jobId, set)
    return () => set.delete(fn)
  }
  publish(jobId: string, event: any) {
    for (const fn of this.subs.get(jobId) ?? []) fn(event)
  }
}

export type JobDeps = {
  store: Store
  hub: JobHub
  meta: ChatClient
  searchPapers: (q: string) => Promise<Paper[] | null>
  doiResolves: (doi: string) => Promise<boolean>
  log?: LogEvent
}

/** Request -> case match -> research -> programme, streaming every step. Never throws. */
export async function runRequestJob(deps: JobDeps, ws: string, jobId: string, request: RequestInput): Promise<void> {
  const emit = (e: any) => {
    deps.store.pushJobEvent(jobId, e)
    deps.hub.publish(jobId, e)
  }
  let programmeId: string | null = null
  const started = Date.now()
  const finished = (outcome: string, extra: Record<string, unknown> = {}) =>
    deps.log?.('build_finished', { jobId, programmeId, outcome, seconds: Math.round((Date.now() - started) / 1000), ...extra })
  try {
    const files = deps.store.files(ws, request.fileIds)
    const match = await matchCase(deps.meta, request.text, files)
    if ('declined' in match) {
      emit({ type: 'declined', reason: match.reason })
      finished('declined')
      deps.store.finishJob(jobId, 'done')
      return
    }
    programmeId = deps.store.createProgramme(ws, request)
    deps.store.saveProgramme(ws, programmeId, { match, caseId: match.caseId })
    emit({ type: 'matched', match, programmeId })
    const brief = await runResearch({ client: deps.meta, searchPapers: deps.searchPapers, doiResolves: deps.doiResolves, emit }, match, files)
    deps.store.saveProgramme(ws, programmeId, { brief })
    emit({ type: 'building' })
    const built = await buildProgramme(deps.meta, { match, brief, files })
    if ('questions' in built) {
      deps.store.saveProgramme(ws, programmeId, { questions: built.questions })
      emit({ type: 'questions', questions: built.questions, programmeId })
      finished('questions', { questions: built.questions.length })
    } else {
      deps.store.saveProgramme(ws, programmeId, { programme: built.programme })
      emit({ type: 'done', programmeId })
      finished('done', { language: built.programme.language, sources: brief.sources.length })
    }
    deps.store.finishJob(jobId, 'done', programmeId)
  } catch (e) {
    finished('failed', { error: clip((e as Error)?.message) })
    emit({ type: 'failed', code: 'build_failed', message: 'Something went wrong while researching and building. Please try again in a minute.' })
    deps.store.finishJob(jobId, 'failed', programmeId)
  }
}
