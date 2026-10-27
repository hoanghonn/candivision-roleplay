// Live judge check: scores one transcript 3 times with an empty cache each time.
// Run: NODE_OPTIONS=--experimental-sqlite npx tsx --env-file=.env scripts/try-judges.ts programme.json
import { readFileSync } from 'node:fs'
import { ProgrammeSchema, type Turn } from '@roleplay/core'
import { scoreCall } from '../apps/server/src/judges'
import { openStore } from '../apps/server/src/store'
import { baseten, meta } from './clients'

const programme = ProgrammeSchema.parse(JSON.parse(readFileSync(process.argv[2], 'utf8')).programme)
const L = programme.levels[1]
const turns: Turn[] = [
  { speaker: 'persona', text: L.opening, atMs: 0, mood: L.moodStart },
  { speaker: 'learner', text: 'Hi, it is the engineer from the vendor. The database cluster had a replication lag issue and the failover script hit a deadlock.', atMs: 4000, mood: null },
  { speaker: 'persona', text: 'Stop with the jargon! When exactly will this be fixed?', atMs: 8000, mood: 85 },
  { speaker: 'learner', text: 'I am sorry. This is on us, and I understand your warehouse has been stopped for two hours.', atMs: 15000, mood: null },
  { speaker: 'persona', text: 'Okay, thanks for owning that. But when exactly is the fix, and when do you update me?', atMs: 20000, mood: 75 },
  { speaker: 'learner', text: 'Orders are saving again on our side now. We are watching it, and I will call you again at 3 pm with the next update.', atMs: 28000, mood: null },
]
for (let run = 1; run <= 3; run++) {
  const t0 = Date.now()
  const { verdicts: v } = await scoreCall({ meta, open: baseten, store: openStore(':memory:') }, { hash: 'live', programme }, turns)
  console.log(`run ${run} ${Date.now() - t0}ms judge2=${v[0].judge2}`)
  for (const x of v) console.log(`  ${x.lineId} ${x.result.padEnd(7)} a=${x.readings[0]?.result ?? 'invalid'} b=${x.readings[1]?.result ?? 'invalid'}  ${programme.rubric.find((r) => r.id === x.lineId)!.text}`)
}
