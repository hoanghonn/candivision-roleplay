// Live smoke test of request -> research -> programme: npx tsx --env-file=.env scripts/try-build.ts "request" [out.json]
import { writeFileSync } from 'node:fs'
import { buildProgramme } from '../apps/server/src/builder'
import { matchCase } from '../apps/server/src/intake'
import { doiResolves, searchPapers } from '../apps/server/src/papers'
import { runResearch } from '../apps/server/src/research'
import { meta } from './clients'

const request = process.argv[2] ?? 'Our engineers make outage calls to clients worse'
const t0 = Date.now()
const s = () => `${((Date.now() - t0) / 1000).toFixed(1)}s`
const match = await matchCase(meta, request, [])
if ('declined' in match) { console.log('declined', match.reason); process.exit(0) }
const brief = await runResearch({ client: meta, searchPapers: (q) => searchPapers(q), doiResolves: (d) => doiResolves(d), emit: () => {} }, match, [])
console.log(s(), 'research done,', brief.items.length, 'items')
const res = await buildProgramme(meta, { match, brief, files: [] })
console.log(s(), 'build done')
if ('questions' in res) console.log('QUESTIONS', res.questions)
else {
  const p = res.programme
  console.log(p.title, '|', p.language, '|', p.persona.name, '-', p.persona.role)
  for (const l of p.levels) console.log(' ', l.id, l.title, `mood ${l.moodStart}/${l.moodFloor}:`, l.opening)
  for (const r of p.rubric) console.log(' ', r.mustHave ? 'MUST' : 'nice', r.text, r.sources.join(','))
  for (const f of p.persona.facts) console.log('  fact', f.fact, '<-', f.earnedBy)
  if (process.argv[3]) writeFileSync(process.argv[3], JSON.stringify({ request, match, brief, programme: p }, null, 2))
}
