import { quoteIn } from './text'
import type { Excerpt, FileText, Problem, Programme, ResearchBrief } from './types'

type Grounded = { sources: string[]; excerpts: Excerpt[] }

/** Every skill, level and rubric line must point at a verified source or a quote from the customer's own files. */
export function validateProgramme(p: Programme, brief: ResearchBrief, files: FileText[]): Problem[] {
  const problems: Problem[] = []
  const known = new Set(brief.items.map((i) => i.sourceId))
  const byId = new Map(files.map((f) => [f.id, f]))

  const check = (g: Grounded, path: string, label: string) => {
    if (g.sources.length === 0 && g.excerpts.length === 0) {
      problems.push({ path, message: `${label} has no source and no quote from your files.` })
      return
    }
    g.sources.forEach((id, i) => {
      if (!known.has(id)) problems.push({ path: `${path}.sources[${i}]`, message: `${label} cites a source that is not in the research brief.` })
    })
    g.excerpts.forEach((e, i) => {
      const file = byId.get(e.fileId)
      if (!file) problems.push({ path: `${path}.excerpts[${i}]`, message: `${label} quotes a file that was not uploaded.` })
      else if (!quoteIn(file.text, e.quote)) problems.push({ path: `${path}.excerpts[${i}]`, message: `${label} quotes words that are not in ${file.name}.` })
    })
  }

  p.skills.forEach((s, i) => check(s, `skills[${i}]`, `The skill "${s.name}"`))
  p.levels.forEach((l, i) => {
    check(l, `levels[${i}]`, `Level ${l.id}`)
    if (l.moodFloor > l.moodStart) problems.push({ path: `levels[${i}].moodFloor`, message: `Level ${l.id} has a calmest mood above its starting mood.` })
  })
  const ids = p.levels.map((l) => l.id)
  if (ids[0] !== 'L1' || new Set(ids).size !== ids.length) problems.push({ path: 'levels', message: 'Levels must start at L1 and each level must appear once.' })

  const skillIds = new Set(p.skills.map((s) => s.id))
  p.rubric.forEach((r, i) => {
    check(r, `rubric[${i}]`, `The rubric line "${r.text}"`)
    if (!skillIds.has(r.skillId)) problems.push({ path: `rubric[${i}].skillId`, message: `The rubric line "${r.text}" belongs to a skill that does not exist.` })
  })
  if (!p.rubric.some((r) => r.mustHave)) problems.push({ path: 'rubric', message: 'At least one rubric line must be a must-have.' })
  return problems
}

/** Whether the programme rests on research, on the customer's own material, or both. */
export function groundingMix(p: Programme): 'research' | 'customer' | 'mixed' {
  const all: Grounded[] = [...p.skills, ...p.levels, ...p.rubric]
  const research = all.some((g) => g.sources.length > 0)
  const customer = all.some((g) => g.excerpts.length > 0)
  return research && customer ? 'mixed' : customer ? 'customer' : 'research'
}
