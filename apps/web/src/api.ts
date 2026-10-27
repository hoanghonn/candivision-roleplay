let memoryId: string | null = null

/** A random id per browser; it is the visitor's private workspace. No login. */
export function visitorId(): string {
  try {
    let id = localStorage.getItem('cvr.visitor')
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('cvr.visitor', id) }
    return id
  } catch {
    memoryId ??= crypto.randomUUID()
    return memoryId
  }
}

export class ApiError extends Error {
  status: number
  body: any
  constructor(status: number, message: string, body: any) {
    super(message)
    this.status = status
    this.body = body
  }
}

/** JSON fetch with the visitor id; non-2xx throws ApiError carrying the server's plain-words message. */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { 'x-visitor-id': visitorId(), ...(init.headers as Record<string, string>) }
  if (typeof init.body === 'string') headers['Content-Type'] = 'application/json'
  const res = await fetch(path, { ...init, headers })
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, body?.message ?? 'Something went wrong. Please try again.', body)
  return body as T
}

export const post = <T>(path: string, body?: unknown) => api<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) })

export const wsUrl = (path: string) => `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}${path}`

export type SiteMode = 'full' | 'calls_only' | 'read_only'
export type ProgrammeSummary = {
  id: string
  title: string
  caseId: string | null
  status: 'draft' | 'published'
  readyBuilt: boolean
  language: string | null
  ready: boolean
  latestVersionId: string | null
}

export const CASE_LABELS: Record<string, string> = {
  outage_call: 'Outage call',
  sales_onboarding: 'Sales onboarding',
  customer_service: 'Customer service',
  partner_certification: 'Partner certification',
  manager_conversations: 'Hard conversations',
  regulated_messaging: 'Regulated messaging',
  generic: 'Other conversation',
}
export const LANGUAGE_LABELS: Record<string, string> = { en: 'English', vi: 'Vietnamese', ja: 'Japanese' }
