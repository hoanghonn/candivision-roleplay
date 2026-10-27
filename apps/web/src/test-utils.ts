import { vi } from 'vitest'

type Handler = (init: RequestInit | undefined, url: string) => { status?: number; body: unknown } | unknown

/** Replaces fetch with a table of `METHOD /path` handlers; unknown routes are 404. Returns the call log. */
export function mockFetch(routes: Record<string, Handler>) {
  const calls: { method: string; url: string; body: unknown }[] = []
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = (init?.method ?? 'GET').toUpperCase()
    const path = url.split('?')[0]
    calls.push({ method, url, body: typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body })
    const key = Object.keys(routes).find((k) => {
      const [m, p] = k.split(' ')
      if (m !== method) return false
      const re = new RegExp(`^${p.replace(/:[a-zA-Z]+/g, '[^/]+')}$`)
      return re.test(path)
    })
    if (!key) return new Response(JSON.stringify({ error: 'not found' }), { status: 404 })
    const out = routes[key](init, url) as any
    const wrapped = out && typeof out === 'object' && 'body' in out && ('status' in out || Object.keys(out).length === 1) ? out : { body: out }
    return new Response(JSON.stringify(wrapped.body), { status: wrapped.status ?? 200, headers: { 'Content-Type': 'application/json' } })
  })
  vi.stubGlobal('fetch', fn)
  return calls
}
