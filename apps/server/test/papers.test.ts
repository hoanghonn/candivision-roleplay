import { describe, expect, it } from 'vitest'
import { doiResolves, paperSource, searchPapers } from '../src/papers'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const openAlexHit = {
  results: [
    {
      doi: 'https://doi.org/10.1111/NCMR.12073',
      title: 'An exploration of the structure of effective apologies',
      publication_year: 2016,
      authorships: [{ author: { display_name: 'Roy Lewicki' } }, { author: { display_name: 'Beth Polin' } }],
      abstract_inverted_index: { Apologies: [0], work: [1] },
    },
  ],
}

describe('searchPapers', () => {
  it('rebuilds the abstract from the inverted index', async () => {
    const [p] = (await searchPapers('apology', { fetch: async () => json({ results: [{ ...openAlexHit.results[0], abstract_inverted_index: { a: [0], b: [1] } }] }) }))!
    expect(p.abstract).toBe('a b')
  })

  it('strips the doi.org prefix and lowercases', async () => {
    const [p] = (await searchPapers('apology', { fetch: async () => json(openAlexHit) }))!
    expect(p.doi).toBe('10.1111/ncmr.12073')
    expect(p.link).toBe('https://doi.org/10.1111/ncmr.12073')
    expect(p.authors).toBe('Roy Lewicki, Beth Polin')
    expect(p.year).toBe(2016)
  })

  it('falls back to Crossref when OpenAlex returns 500', async () => {
    const calls: string[] = []
    const fake = async (url: string | URL | Request) => {
      calls.push(String(url))
      if (String(url).includes('openalex')) return json({}, 500)
      return json({ message: { items: [{ DOI: '10.1/ABC', title: ['A paper'], author: [{ given: 'Ann', family: 'Lee' }], issued: { 'date-parts': [[2020]] }, abstract: '<jats:p>Short <b>text</b></jats:p>', 'is-referenced-by-count': 25 }] } })
    }
    const res = (await searchPapers('x y', { fetch: fake as typeof fetch }))!
    expect(calls.some((c) => c.includes('crossref'))).toBe(true)
    expect(res[0]).toMatchObject({ doi: '10.1/abc', title: 'A paper', authors: 'Ann Lee', year: 2020, abstract: 'Short text' })
  })

  it('returns null when both sources are down', async () => {
    const res = await searchPapers('x', { fetch: (async () => { throw new Error('down') }) as typeof fetch })
    expect(res).toBeNull()
  })

  it('returns [] when OpenAlex worked but found nothing and Crossref is down', async () => {
    const fake = async (url: string | URL | Request) => { if (String(url).includes('openalex')) return json({ results: [] }); throw new Error('down') }
    expect(await searchPapers('x', { fetch: fake as typeof fetch })).toEqual([])
  })
})

describe('citation floor', () => {
  it('asks OpenAlex for works cited at least 10 times and passes the count on', async () => {
    const urls: string[] = []
    const [p] = (await searchPapers('apology', { fetch: (async (u: string) => { urls.push(String(u)); return json({ results: [{ ...openAlexHit.results[0], cited_by_count: 812 }] }) }) as typeof fetch }))!
    expect(urls[0]).toContain('cited_by_count:>9')
    expect(p.citations).toBe(812)
  })

  it('drops Crossref hits cited fewer than 10 times', async () => {
    const fake = async (url: string | URL | Request) => {
      if (String(url).includes('openalex')) return json({ results: [] })
      return json({ message: { items: [
        { DOI: '10.1/low', title: ['Barely cited'], 'is-referenced-by-count': 3 },
        { DOI: '10.1/high', title: ['Well cited'], 'is-referenced-by-count': 140 },
      ] } })
    }
    const res = (await searchPapers('x', { fetch: fake as typeof fetch }))!
    expect(res.map((p) => p.doi)).toEqual(['10.1/high'])
    expect(String(res[0].citations)).toBe('140')
  })
})

describe('doiResolves', () => {
  it('is true on responseCode 1', async () => {
    expect(await doiResolves('10.1/x', { fetch: async () => json({ responseCode: 1 }) })).toBe(true)
  })
  it('is false on responseCode 100 and on network error', async () => {
    expect(await doiResolves('10.1/x', { fetch: async () => json({ responseCode: 100 }, 404) })).toBe(false)
    expect(await doiResolves('10.1/x', { fetch: (async () => { throw new Error('down') }) as typeof fetch })).toBe(false)
  })
})

describe('paperSource', () => {
  it('builds a P: source', () => {
    const s = paperSource({ doi: '10.1/x', title: 'T', authors: 'A', year: 2000, abstract: '', link: 'https://doi.org/10.1/x', citations: 50 }, 'our words')
    expect(s).toMatchObject({ id: 'P:10.1/x', kind: 'paper', summary: 'our words' })
  })
})
