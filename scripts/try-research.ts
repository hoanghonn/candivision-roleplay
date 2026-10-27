// Live smoke test: npx tsx --env-file=.env scripts/try-research.ts "request text"
import { matchCase } from '../apps/server/src/intake'
import { doiResolves, searchPapers } from '../apps/server/src/papers'
import { runResearch } from '../apps/server/src/research'
import { meta } from './clients'

const request = process.argv[2] ?? 'Our engineers make outage calls to clients worse'
const t0 = Date.now()
const s = () => `${((Date.now() - t0) / 1000).toFixed(1)}s`
const match = await matchCase(meta, request, [])
console.log(s(), 'match', JSON.stringify(match))
if ('declined' in match) process.exit(0)
const brief = await runResearch({ client: meta, searchPapers: (q) => searchPapers(q), doiResolves: (d) => doiResolves(d), emit: (e) => console.log(s(), e.type, 'source' in e ? e.source.id : 'sourceId' in e ? `${e.sourceId} ${'reason' in e ? e.reason : ''}` : 'query' in e ? e.query : e.question) }, match, [])
console.log(s(), 'brief')
for (const i of brief.items) console.log(' ', i.use, i.sourceId, '-', i.gives)
console.log('  notFound:', brief.notFound)
