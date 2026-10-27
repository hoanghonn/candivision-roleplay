import { CASES, findMethods, METHODS, methodSource, type BriefItem, type CaseMatch, type FileText, type ResearchBrief, type Source } from '@roleplay/core'
import { filesBlock } from './intake'
import { MUSE, type ChatClient } from './llm'
import { paperSource, type Paper } from './papers'

export type ResearchEvent =
  | { type: 'searching'; query: string }
  | { type: 'candidate'; source: Source }
  | { type: 'verified'; sourceId: string; use: 'handle' | 'learn' }
  | { type: 'dropped'; sourceId: string; reason: string }
  | { type: 'not_found'; question: string }

export type ResearchDeps = {
  client: ChatClient
  searchPapers: (query: string) => Promise<Paper[]>
  doiResolves: (doi: string) => Promise<boolean>
  emit: (e: ResearchEvent) => void
  now?: () => number
}

const DEADLINE_MS = 75_000
const MAX_ROUNDS = 8
const MAX_SEARCHES = 6
const OUT_OF_TIME = 'Paper search ran out of time'
const UNAVAILABLE = 'Paper search was unavailable, so this brief uses the method library only'

const fn = (name: string, description: string, properties: Record<string, unknown>, required: string[]) => ({
  type: 'function',
  function: { name, description, parameters: { type: 'object', properties, required } },
})

const TOOLS = [
  fn('search_papers', 'Search open scholarly databases (OpenAlex, Crossref) for research papers. Returns sourceId, title, authors, year and abstract.', { query: { type: 'string', description: 'a short English search query' } }, ['query']),
  fn('method_library', 'Look up our vetted library of proven methods. Returns sourceId, title and what the method gives.', { topic: { type: 'string' } }, ['topic']),
  fn(
    'submit_brief',
    'Submit the research brief. Only use sourceIds that a tool returned.',
    {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            sourceId: { type: 'string' },
            gives: { type: 'string', description: 'what this source tells us to do or train, in your own words, one or two sentences, never quoted' },
            use: { type: 'string', enum: ['handle', 'learn'], description: 'handle = how experts handle the situation; learn = how people learn it' },
          },
          required: ['sourceId', 'gives', 'use'],
        },
      },
      notFound: { type: 'array', items: { type: 'string' }, description: 'questions the research could not answer, for the training lead' },
    },
    ['items', 'notFound'],
  ),
]

const SYSTEM = `You are the research step of a training platform that builds voice role-play practice. Research first, never guess.
Find (1) how experts handle the situation (use "handle") and (2) how people learn this kind of skill (use "learn").
Start from the method library entries already found, then search for papers that add something specific to this situation.
Prefer meta-analyses, reviews and well-cited studies (see citedBy); skip papers that only describe a product or are about an unrelated field. Use 2 to 4 searches with short English queries.
Write "gives" in your own words; never copy text from an abstract.
If something the training lead would need is not covered by any source, put it in notFound as a question instead of guessing.
Only cite sourceIds a tool returned. Finish by calling submit_brief with 4 to 8 items.`

export async function runResearch(deps: ResearchDeps, match: CaseMatch, files: FileText[]): Promise<ResearchBrief> {
  const now = deps.now ?? Date.now
  const start = now()
  const seen = new Map<string, Source>()
  const verified = new Set<string>()

  const addMethod = (slug: string) => {
    const m = METHODS.find((x) => x.slug === slug)
    if (!m) return null
    const s = methodSource(m)
    if (!seen.has(s.id)) {
      seen.set(s.id, s)
      deps.emit({ type: 'candidate', source: s })
      verified.add(s.id)
      deps.emit({ type: 'verified', sourceId: s.id, use: m.use })
    }
    return m
  }

  const template = CASES[match.caseId]
  const seedItems: BriefItem[] = template.methodSeeds.flatMap((slug) => {
    const m = addMethod(slug)
    return m ? [{ sourceId: `M:${m.slug}`, gives: m.gives.join(' '), use: m.use }] : []
  })

  const messages: any[] = [
    { role: 'system', content: SYSTEM },
    {
      role: 'user',
      content: `Situation: ${match.situation}
Learner: ${match.learnerRole}. Counterpart: ${match.counterpartRole}. Language of the conversation: ${match.language}.
What goes wrong today: ${match.stakes}
What the customer says ready means: ${match.readyMeans.join('; ') || 'not stated'}
Case: ${template.name}. Typical ready: ${template.readyLooksLike.join('; ') || 'not set'}
Method library entries already found: ${seedItems.map((i) => i.sourceId).join(', ')}
${filesBlock(files, 1500)}`,
    },
  ]

  let searches = 0
  let submitted: { items: BriefItem[]; notFound: string[] } | null = null
  let outOfTime = false
  let modelFailed = false

  async function runTool(name: string, args: any): Promise<string> {
    if (name === 'search_papers') {
      if (searches >= MAX_SEARCHES) return 'Search limit reached. Submit the brief now.'
      searches++
      const query = String(args.query ?? '').slice(0, 200)
      deps.emit({ type: 'searching', query })
      let papers: Paper[] = []
      try {
        papers = await deps.searchPapers(query)
      } catch {
        return 'Search is unavailable. Use the method library.'
      }
      const out = papers.map((p) => {
        const s = paperSource(p, '')
        if (!seen.has(s.id)) {
          seen.set(s.id, s)
          deps.emit({ type: 'candidate', source: s })
        }
        return { sourceId: s.id, title: p.title, authors: p.authors, year: p.year, citedBy: p.citations, abstract: p.abstract.slice(0, 600) }
      })
      return out.length ? JSON.stringify(out) : 'No papers found.'
    }
    if (name === 'method_library') {
      const found = findMethods(String(args.topic ?? ''))
      for (const m of found) addMethod(m.slug)
      return found.length ? JSON.stringify(found.map((m) => ({ sourceId: `M:${m.slug}`, title: m.title, authors: m.authors, year: m.year, gives: m.gives }))) : 'No library entries match.'
    }
    if (name === 'submit_brief') {
      const items: BriefItem[] = (Array.isArray(args.items) ? args.items : [])
        .filter((i: any) => i && typeof i.sourceId === 'string' && typeof i.gives === 'string' && i.gives.trim())
        .map((i: any) => ({ sourceId: i.sourceId.trim(), gives: i.gives.trim().slice(0, 400), use: i.use === 'learn' ? 'learn' : 'handle' }))
      const notFound = (Array.isArray(args.notFound) ? args.notFound : []).map(String).filter(Boolean).slice(0, 5)
      submitted = { items, notFound }
      return 'Brief received.'
    }
    return 'Unknown tool.'
  }

  for (let round = 0; round < MAX_ROUNDS && !submitted; round++) {
    const remaining = DEADLINE_MS - (now() - start)
    if (remaining <= 0) { outOfTime = true; break }
    let res: any
    try {
      res = await deps.client.chat.completions.create({ model: MUSE, reasoning_effort: 'low', messages, tools: TOOLS }, { timeout: Math.min(remaining, 30_000) })
    } catch {
      modelFailed = true
      break
    }
    const msg = res?.choices?.[0]?.message ?? {}
    const calls: any[] = msg.tool_calls ?? []
    if (calls.length === 0) break
    const results: any[] = []
    for (const call of calls) {
      let args: any = {}
      try { args = JSON.parse(call.function?.arguments || '{}') } catch { /* empty args */ }
      results.push({ role: 'tool', tool_call_id: call.id, content: await runTool(call.function?.name, args) })
    }
    messages.push({ role: 'assistant', content: msg.content ?? '', tool_calls: calls }, ...results)
    if (now() - start >= DEADLINE_MS && !submitted) { outOfTime = true; break }
  }

  // Verification: only sources a tool returned, and every paper DOI must resolve.
  const proposed: BriefItem[] = [...((submitted as { items: BriefItem[] } | null)?.items ?? [])]
  for (const seed of seedItems) if (!proposed.some((i) => i.sourceId === seed.sourceId)) proposed.push(seed)
  const kept: BriefItem[] = []
  const paperIds = [...new Set(proposed.map((i) => i.sourceId).filter((id) => id.startsWith('P:') && seen.has(id)))]
  const resolved = new Map(await Promise.all(paperIds.map(async (id) => [id, await deps.doiResolves(id.slice(2)).catch(() => false)] as const)))
  const dropped = new Set<string>()
  for (const item of proposed) {
    if (kept.some((k) => k.sourceId === item.sourceId)) continue
    if (!seen.has(item.sourceId)) {
      if (!dropped.has(item.sourceId)) deps.emit({ type: 'dropped', sourceId: item.sourceId, reason: 'Not returned by the search tools' })
      dropped.add(item.sourceId)
      continue
    }
    if (item.sourceId.startsWith('P:')) {
      if (!resolved.get(item.sourceId)) {
        if (!dropped.has(item.sourceId)) deps.emit({ type: 'dropped', sourceId: item.sourceId, reason: 'The DOI did not resolve' })
        dropped.add(item.sourceId)
        continue
      }
      if (!verified.has(item.sourceId)) { verified.add(item.sourceId); deps.emit({ type: 'verified', sourceId: item.sourceId, use: item.use }) }
    }
    kept.push(item)
  }
  for (const id of seen.keys()) {
    if (!kept.some((k) => k.sourceId === id) && !dropped.has(id)) deps.emit({ type: 'dropped', sourceId: id, reason: 'Not used: less relevant than the sources kept' })
  }

  const notFound = [...((submitted as { notFound: string[] } | null)?.notFound ?? [])]
  if (outOfTime) notFound.push(OUT_OF_TIME)
  else if (modelFailed || !submitted) notFound.push(UNAVAILABLE)
  for (const q of notFound) deps.emit({ type: 'not_found', question: q })

  const sources = kept.map((k) => {
    const s = seen.get(k.sourceId)!
    return s.kind === 'paper' ? { ...s, summary: k.gives } : s
  })
  return { sources, items: kept, notFound }
}
