import { createHash } from 'node:crypto'

/**
 * One usage or failure event. In production each is a JSON line on stdout, which Cloud Logging reads as a structured entry.
 * Fields never carry learner names, transcripts, customer files or the raw visitor id: the visitor id opens its workspace.
 */
export type LogEvent = (event: string, fields?: Record<string, unknown>) => void

/** A stable, short stand-in for a visitor id, so visits can be counted without the id that opens the workspace. */
export const anon = (visitorId: string) => createHash('sha256').update(visitorId).digest('hex').slice(0, 12)

const WARN = /_(failed|error)$|^server_error$/

export const stdoutLog: LogEvent = (event, fields = {}) => {
  console.log(JSON.stringify({ severity: WARN.test(event) ? 'WARNING' : 'INFO', message: event, event, ...fields }))
}

export const noLog: LogEvent = () => {}

/** Short text for a log field; errors and provider messages are cut so a long body never floods the log. */
export const clip = (s: unknown, n = 200) => String(s ?? '').slice(0, n)
