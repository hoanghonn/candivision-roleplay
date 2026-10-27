import { describe, expect, it } from 'vitest'
import { CASES } from '../src/cases'
import { findMethods, METHODS, methodSource } from '../src/methods'
import { CASE_IDS } from '../src/types'

describe('case templates', () => {
  it('every case id has a template', () => {
    for (const id of CASE_IDS) expect(CASES[id]?.id).toBe(id)
  })

  it('every method seed exists in the library', () => {
    const slugs = new Set(METHODS.map((m) => m.slug))
    for (const c of Object.values(CASES)) for (const s of c.methodSeeds) expect(slugs, `${c.id} -> ${s}`).toContain(s)
  })
})

describe('method library', () => {
  it('entries are short, in our words, with gives and an https link', () => {
    for (const m of METHODS) {
      expect(m.summary.length, m.slug).toBeLessThanOrEqual(600)
      expect(m.gives.length, m.slug).toBeGreaterThan(0)
      expect(m.link.startsWith('https://'), m.slug).toBe(true)
    }
  })

  it('DOI entries link to doi.org', () => {
    for (const m of METHODS) if (m.doi) expect(m.link).toBe(`https://doi.org/${m.doi}`)
  })

  it('slugs are unique', () => {
    expect(new Set(METHODS.map((m) => m.slug)).size).toBe(METHODS.length)
  })

  it('finds outage methods for an angry client after an outage', () => {
    expect(['service-recovery', 'apology-structure', 'incident-comms']).toContain(findMethods('angry client after an outage')[0].slug)
  })

  it('finds nothing for nonsense', () => {
    expect(findMethods('zzz')).toEqual([])
  })

  it('methodSource builds an M: source', () => {
    const s = methodSource(METHODS[0])
    expect(s.id).toBe(`M:${METHODS[0].slug}`)
    expect(s.kind).toBe('method')
  })
})
