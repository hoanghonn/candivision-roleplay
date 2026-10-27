import type { Source } from '@roleplay/core'

export type Paper = { doi: string; title: string; authors: string; year: number | null; abstract: string; link: string; citations: number }
type Deps = { fetch?: typeof fetch }

const MAX_ABSTRACT = 1200
/** Only works other researchers have cited at least this often: keeps out obscure and predatory venues. */
export const MIN_CITATIONS = 10
const cleanDoi = (d: string) => d.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').trim().toLowerCase()
const stripTags = (s: string) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()

function fromInverted(index: Record<string, number[]> | null | undefined): string {
  if (!index) return ''
  const words: string[] = []
  for (const [word, positions] of Object.entries(index)) for (const p of positions) words[p] = word
  return words.filter(Boolean).join(' ')
}

async function openAlex(f: typeof fetch, query: string): Promise<Paper[]> {
  const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&filter=has_doi:true,type:article,cited_by_count:>${MIN_CITATIONS - 1}&per-page=5&select=doi,title,authorships,publication_year,abstract_inverted_index,cited_by_count&mailto=support@candivision.com`
  const res = await f(url, { signal: AbortSignal.timeout(6000) })
  if (!res.ok) throw new Error(`openalex ${res.status}`)
  const body: any = await res.json()
  return (body.results ?? [])
    .filter((w: any) => w.doi && w.title)
    .map((w: any) => {
      const doi = cleanDoi(w.doi)
      return {
        doi,
        title: stripTags(String(w.title)),
        authors: (w.authorships ?? []).map((a: any) => a.author?.display_name).filter(Boolean).slice(0, 6).join(', '),
        year: w.publication_year ?? null,
        abstract: stripTags(fromInverted(w.abstract_inverted_index)).slice(0, MAX_ABSTRACT),
        link: `https://doi.org/${doi}`,
        citations: Number(w.cited_by_count ?? 0),
      }
    })
}

async function crossref(f: typeof fetch, query: string): Promise<Paper[]> {
  const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=10&select=DOI,title,author,issued,abstract,is-referenced-by-count`
  const res = await f(url, { signal: AbortSignal.timeout(6000) })
  if (!res.ok) throw new Error(`crossref ${res.status}`)
  const body: any = await res.json()
  return (body.message?.items ?? [])
    .filter((w: any) => w.DOI && w.title?.[0] && Number(w['is-referenced-by-count'] ?? 0) >= MIN_CITATIONS)
    .slice(0, 5)
    .map((w: any) => {
      const doi = cleanDoi(w.DOI)
      return {
        doi,
        title: stripTags(String(w.title[0])),
        authors: (w.author ?? []).map((a: any) => [a.given, a.family].filter(Boolean).join(' ')).filter(Boolean).slice(0, 6).join(', '),
        year: w.issued?.['date-parts']?.[0]?.[0] ?? null,
        abstract: stripTags(String(w.abstract ?? '')).slice(0, MAX_ABSTRACT),
        link: `https://doi.org/${doi}`,
        citations: Number(w['is-referenced-by-count'] ?? 0),
      }
    })
}

/**
 * Searches open scholarly APIs: OpenAlex first, Crossref when OpenAlex fails or finds nothing.
 * Never throws; returns null only when both sources are unreachable, so the brief can say papers were unavailable.
 */
export async function searchPapers(query: string, deps: Deps = {}): Promise<Paper[] | null> {
  const f = deps.fetch ?? fetch
  let openAlexUp = false
  try {
    const hits = await openAlex(f, query)
    openAlexUp = true
    if (hits.length) return hits
  } catch {
    // fall through to Crossref
  }
  try {
    return await crossref(f, query)
  } catch {
    return openAlexUp ? [] : null
  }
}

/** True only when the DOI handle system knows the DOI. */
export async function doiResolves(doi: string, deps: Deps = {}): Promise<boolean> {
  const f = deps.fetch ?? fetch
  try {
    const res = await f(`https://doi.org/api/handles/${encodeURIComponent(doi)}`, { signal: AbortSignal.timeout(5000) })
    const body: any = await res.json()
    return body?.responseCode === 1
  } catch {
    return false
  }
}

export function paperSource(p: Paper, summary: string): Source {
  return { id: `P:${p.doi}`, kind: 'paper', title: p.title, authors: p.authors, year: p.year, link: p.link, summary }
}
