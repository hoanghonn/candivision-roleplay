import type { Budget } from './usage'

export type LimitKind = 'programme' | 'edit' | 'call' | 'speech'
type Opts = { programmes: number; edits: number; calls: number; speech?: number; now?: () => number }

/** Daily caps for the public site, per visitor id or per client address; they reset at UTC midnight. */
export class VisitorLimits {
  private day = ''
  private counts = new Map<string, number>()
  constructor(private opts: Opts) {}

  take(visitor: string, kind: LimitKind): boolean {
    const day = new Date((this.opts.now ?? Date.now)()).toISOString().slice(0, 10)
    if (day !== this.day) { this.day = day; this.counts.clear() }
    const key = `${visitor}:${kind}`
    const max = { programme: this.opts.programmes, edit: this.opts.edits, call: this.opts.calls, speech: this.opts.speech ?? 20 }[kind]
    const n = this.counts.get(key) ?? 0
    if (n >= max) return false
    this.counts.set(key, n + 1)
    return true
  }
}

export type SiteMode = 'full' | 'calls_only' | 'read_only'

/** Full until 80% of the day's budget; then only calls on ready-built programmes; at 100% read-only. */
export function siteMode(budget: Budget | undefined, dailyUsd: number): SiteMode {
  if (!budget) return 'full'
  const spent = budget.spentUsd()
  if (spent >= dailyUsd) return 'read_only'
  if (spent >= dailyUsd * 0.8) return 'calls_only'
  return 'full'
}
