import { describe, expect, it } from 'vitest'
import { ProgrammeSchema, ResearchBriefSchema } from '../src/types'
import { outageBrief, outageProgramme } from './fixtures/outage'

describe('ProgrammeSchema', () => {
  it('accepts the outage fixture', () => {
    expect(ProgrammeSchema.safeParse(outageProgramme).success).toBe(true)
    expect(ResearchBriefSchema.safeParse(outageBrief).success).toBe(true)
  })

  it('rejects one level and four levels', () => {
    const one = { ...outageProgramme, levels: outageProgramme.levels.slice(0, 1) }
    const l = outageProgramme.levels[0]
    const four = { ...outageProgramme, levels: [l, { ...l, id: 'L2' }, { ...l, id: 'L3' }, { ...l, id: 'L3' }] }
    expect(ProgrammeSchema.safeParse(one).success).toBe(false)
    expect(ProgrammeSchema.safeParse(four).success).toBe(false)
  })

  it('rejects an unknown voice', () => {
    const bad = { ...outageProgramme, persona: { ...outageProgramme.persona, voice: 'robot' } }
    expect(ProgrammeSchema.safeParse(bad).success).toBe(false)
  })
})
