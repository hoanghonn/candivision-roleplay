import { describe, expect, it } from 'vitest'
import { groundingMix, validateProgramme } from '../src/validate'
import { outageBrief, outageFiles, outageProgramme } from './fixtures/outage'

const p = outageProgramme

describe('validateProgramme', () => {
  it('fixture is valid', () => {
    expect(validateProgramme(p, outageBrief, outageFiles)).toEqual([])
  })

  it('ungrounded rubric line', () => {
    const bad = { ...p, rubric: [{ ...p.rubric[0], sources: [], excerpts: [] }, ...p.rubric.slice(1)] }
    const problems = validateProgramme(bad, outageBrief, outageFiles)
    expect(problems).toHaveLength(1)
    expect(problems[0].path).toBe('rubric[0]')
  })

  it('unknown source id', () => {
    const bad = { ...p, skills: [{ ...p.skills[0], sources: ['P:10.9/made-up'] }, p.skills[1]] }
    expect(validateProgramme(bad, outageBrief, outageFiles).map((x) => x.path)).toEqual(['skills[0].sources[0]'])
  })

  it('excerpt not in file', () => {
    const bad = { ...p, skills: [p.skills[0], { ...p.skills[1], excerpts: [{ fileId: 'f1', quote: 'the client loved our service' }] }] }
    expect(validateProgramme(bad, outageBrief, outageFiles).map((x) => x.path)).toEqual(['skills[1].excerpts[0]'])
  })

  it('excerpt from an unknown file', () => {
    const bad = { ...p, skills: [p.skills[0], { ...p.skills[1], excerpts: [{ fileId: 'nope', quote: 'nobody told us when it would be fixed' }] }] }
    expect(validateProgramme(bad, outageBrief, outageFiles).map((x) => x.path)).toEqual(['skills[1].excerpts[0]'])
  })

  it('no must-have line', () => {
    const bad = { ...p, rubric: p.rubric.map((r) => ({ ...r, mustHave: false })) }
    expect(validateProgramme(bad, outageBrief, outageFiles).map((x) => x.path)).toEqual(['rubric'])
  })

  it('rubric line pointing at a missing skill', () => {
    const bad = { ...p, rubric: [{ ...p.rubric[0], skillId: 's9' }, ...p.rubric.slice(1)] }
    expect(validateProgramme(bad, outageBrief, outageFiles).map((x) => x.path)).toEqual(['rubric[0].skillId'])
  })

  it('levels must start at L1 and be unique, floor at or below start', () => {
    const bad = { ...p, levels: [{ ...p.levels[0], id: 'L2' as const }, { ...p.levels[1], moodFloor: 90 }] }
    const paths = validateProgramme(bad, outageBrief, outageFiles).map((x) => x.path)
    expect(paths).toContain('levels')
    expect(paths).toContain('levels[1].moodFloor')
  })
})

describe('groundingMix', () => {
  it('is mixed for the fixture', () => {
    expect(groundingMix(p)).toBe('mixed')
  })
  it('is research when only sources', () => {
    const r = { ...p, skills: p.skills.map((s) => ({ ...s, excerpts: [] })) }
    expect(groundingMix(r)).toBe('research')
  })
  it('is customer when only excerpts', () => {
    const ex = [{ fileId: 'f1', quote: 'nobody told us when it would be fixed' }]
    const strip = <T extends { sources: string[]; excerpts: unknown[] }>(x: T) => ({ ...x, sources: [], excerpts: ex })
    const c = { ...p, skills: p.skills.map(strip), levels: p.levels.map(strip), rubric: p.rubric.map(strip) }
    expect(groundingMix(c)).toBe('customer')
  })
})
