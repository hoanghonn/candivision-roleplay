import type { CaseMatch } from '@roleplay/core'
import { describe, expect, it } from 'vitest'
import { buildProgramme, editProgramme } from '../src/builder'
import { outageBrief, outageFiles, outageProgramme } from '../../../packages/core/test/fixtures/outage'
import { scripted } from './helpers'

const match: CaseMatch = { caseId: 'outage_call', situation: 'Outage call', learnerRole: 'Engineer', counterpartRole: 'Client', language: 'en', stakes: 'Escalations', readyMeans: ['gives an update time within 2 minutes'] }
const ungrounded = { ...outageProgramme, rubric: [{ ...outageProgramme.rubric[0], sources: ['P:10.9/invented'] }, ...outageProgramme.rubric.slice(1)] }

describe('buildProgramme', () => {
  it('valid on first try', async () => {
    const client = scripted([JSON.stringify(outageProgramme)])
    const res = await buildProgramme(client, { match, brief: outageBrief, files: outageFiles })
    expect(res).toEqual({ programme: outageProgramme })
    expect(client.calls).toHaveLength(1)
  })

  it('puts the brief ids, the files and the customer ready-means in the prompt', async () => {
    const client = scripted([JSON.stringify(outageProgramme)])
    await buildProgramme(client, { match, brief: outageBrief, files: outageFiles })
    const prompt = JSON.stringify(client.calls[0].messages)
    expect(prompt).toContain('M:incident-comms')
    expect(prompt).toContain('nobody told us when it would be fixed')
    expect(prompt).toContain('gives an update time within 2 minutes')
  })

  it('regenerates once then asks', async () => {
    const client = scripted([JSON.stringify(ungrounded), JSON.stringify(ungrounded)])
    const res = await buildProgramme(client, { match, brief: outageBrief, files: outageFiles })
    expect(client.calls).toHaveLength(2)
    expect(JSON.stringify(client.calls[1].messages)).toContain('not in the research brief')
    expect('questions' in res && res.questions.length).toBeGreaterThan(0)
  })

  it('em dashes from the model become normal dashes', async () => {
    const dashed = { ...outageProgramme, levels: outageProgramme.levels.map((l) => ({ ...l, opening: 'Maya here — our system is down' })) }
    const res = await buildProgramme(scripted([JSON.stringify(dashed)]), { match, brief: outageBrief, files: outageFiles })
    expect('programme' in res && res.programme.levels[0].opening).toBe('Maya here - our system is down')
  })

  it('language and case come from the case match, not the model', async () => {
    const vi = { ...match, language: 'vi' as const }
    const res = await buildProgramme(scripted([JSON.stringify({ ...outageProgramme, language: 'en', caseId: 'generic' })]), { match: vi, brief: outageBrief, files: outageFiles })
    expect('programme' in res && res.programme.language).toBe('vi')
    expect('programme' in res && res.programme.caseId).toBe('outage_call')
  })

  it('a regeneration that fixes the problem is accepted', async () => {
    const client = scripted([JSON.stringify(ungrounded), JSON.stringify(outageProgramme)])
    expect(await buildProgramme(client, { match, brief: outageBrief, files: outageFiles })).toEqual({ programme: outageProgramme })
  })
})

describe('editProgramme', () => {
  it('returns the edited programme with its changes', async () => {
    const angrier = { ...outageProgramme, levels: outageProgramme.levels.map((l) => ({ ...l, moodStart: Math.min(100, l.moodStart + 15) })) }
    const client = scripted([JSON.stringify({ programme: angrier, changes: ['The client starts angrier at every level.'] })])
    const res = await editProgramme(client, { programme: outageProgramme, brief: outageBrief, files: outageFiles, instruction: 'make the client angrier' })
    expect(res).toEqual({ programme: angrier, changes: ['The client starts angrier at every level.'] })
  })

  it('edit that removes all sources returns problems', async () => {
    const stripped = { ...outageProgramme, rubric: outageProgramme.rubric.map((r) => ({ ...r, sources: [], excerpts: [] })) }
    const client = scripted([JSON.stringify({ programme: stripped, changes: ['Removed sources'] })])
    const res = await editProgramme(client, { programme: outageProgramme, brief: outageBrief, files: outageFiles, instruction: 'remove the sources' })
    expect('problems' in res && res.problems.length).toBe(3)
    expect(client.calls).toHaveLength(1)
  })

  it('an edit keeps the case id', async () => {
    const client = scripted([JSON.stringify({ programme: { ...outageProgramme, caseId: 'generic' }, changes: [] })])
    const res = await editProgramme(client, { programme: outageProgramme, brief: outageBrief, files: outageFiles, instruction: 'harder' })
    expect('programme' in res && res.programme.caseId).toBe('outage_call')
  })

  it('edit keeps language unless asked', async () => {
    const client = scripted([JSON.stringify({ programme: outageProgramme, changes: [] })])
    await editProgramme(client, { programme: outageProgramme, brief: outageBrief, files: outageFiles, instruction: 'x'.repeat(600) })
    const user = client.calls[0].messages[1].content as string
    expect(user).toContain('Current language: en')
    expect(client.calls[0].messages[0].content).toMatch(/Keep the language the same/)
    expect(user).not.toContain('x'.repeat(501))
  })
})
