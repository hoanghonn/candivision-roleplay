// Builds one ready-built programme with the real pipeline and writes apps/server/seeds/library/<caseId>.json.
// Run: NODE_OPTIONS=--experimental-sqlite npx tsx --env-file=.env scripts/build-library.ts outage_call
// It refuses to write a programme that fails validation or its test call.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { validateProgramme, type CaseId, type FileText, type Programme, type Turn } from '@roleplay/core'
import { z } from 'zod'
import { buildProgramme } from '../apps/server/src/builder'
import { matchCase } from '../apps/server/src/intake'
import { scoreCall } from '../apps/server/src/judges'
import { chatJson, MUSE } from '../apps/server/src/llm'
import { doiResolves, searchPapers } from '../apps/server/src/papers'
import { applyReply, personaTurn } from '../apps/server/src/persona'
import { runResearch } from '../apps/server/src/research'
import { openStore } from '../apps/server/src/store'
import { runTestCall } from '../apps/server/src/testcall'
import { baseten, meta } from './clients'

const REQUESTS: Record<string, { text: string; sampleLevel: string; learner: string }> = {
  outage_call: {
    text: "When production goes down, our engineers call the client and it gets worse. They over-explain the technical cause, never say sorry, and can't give a time for the next update. Last month a client in Osaka escalated to our CEO. Ready means: they own it in the first minute, explain impact in plain words and always give a time for the next update.",
    sampleLevel: 'L2',
    learner: 'Sample learner',
  },
  sales_onboarding: {
    text: "New sales reps at our HR software company start demoing features in the first minute of discovery calls and fold at the first price objection. Ready means: they find two needs before any demo, handle our top three objections from the playbook, and always book a next step.",
    sampleLevel: 'L1',
    learner: 'Sample learner',
  },
  customer_service: {
    text: 'Nhân viên tổng đài của chúng tôi xử lý rất kém khi khách hàng gọi đến phàn nàn vì bị từ chối hoàn tiền hoặc bị trừ tiền hai lần. Họ đọc chính sách như robot, không xin lỗi, và khách hàng dọa đăng lên mạng xã hội. Chúng tôi muốn họ biết lắng nghe, xin lỗi, làm đúng chính sách và hẹn thời gian trả lời rõ ràng.',
    sampleLevel: 'L1',
    learner: 'Học viên mẫu',
  },
  partner_certification: {
    text: "Our reseller partners in Southeast Asia misquote our pricing and promise features we don't have when they pitch our cloud backup product. Before a partner can sell, they must pass a call with a buyer: correct facts and prices, a pitch that fits the buyer's need, and no false claims.",
    sampleLevel: 'L1',
    learner: 'Sample partner',
  },
  manager_conversations: {
    text: 'Our new engineering managers avoid hard conversations. When a senior engineer keeps missing code review deadlines and gets defensive, they either say nothing or make it personal. We want them to talk about the behaviour and its impact, listen, and agree next steps.',
    sampleLevel: 'L1',
    learner: 'Sample manager',
  },
  regulated_messaging: {
    text: 'Our medical representatives talk to doctors about a blood pressure medicine. Doctors often ask about using it outside the approved use, and reps improvise. They must stick to the approved claims, give the safety information whenever benefits come up, and redirect off-label questions to Medical Information.',
    sampleLevel: 'L1',
    learner: 'Sample representative',
  },
}

const caseId = process.argv[2] as CaseId
const req = REQUESTS[caseId]
if (!req) throw new Error(`unknown case ${caseId}`)
const t0 = Date.now()
const log = (...a: unknown[]) => console.log(`${((Date.now() - t0) / 1000).toFixed(1)}s`, ...a)

const dir = new URL('../apps/server/seeds/library-files/', import.meta.url)
const files: FileText[] = readdirSync(dir)
  .filter((f) => f.startsWith(`${caseId}.`))
  .sort()
  .map((f, i) => ({ id: `lib-${caseId}-f${i + 1}`, name: f.slice(caseId.length + 1), text: readFileSync(new URL(f, dir), 'utf8') }))

const matched = await matchCase(meta, req.text, files)
if ('declined' in matched) throw new Error(`declined: ${matched.reason}`)
const match = { ...matched, caseId }
log('matched', match.language, match.situation)
const brief = await runResearch({ client: meta, searchPapers: (q) => searchPapers(q), doiResolves: (d) => doiResolves(d), emit: () => {} }, match, files)
log('research', brief.items.length, 'items', brief.items.filter((i) => i.sourceId.startsWith('P:')).length, 'papers')
const built = await buildProgramme(meta, { match, brief, files })
if ('questions' in built) throw new Error(`questions: ${built.questions.join(' | ')}`)
const programme: Programme = { ...built.programme, caseId }
const problems = validateProgramme(programme, brief, files)
if (problems.length) throw new Error(`invalid: ${JSON.stringify(problems)}`)
log('programme', programme.title, programme.levels.length, 'levels', programme.rubric.length, 'lines')
const testCall = await runTestCall(meta, programme)
log('test call', testCall)
if (!testCall.ok) throw new Error('test call failed; run again')

// A sample call: a decent but imperfect learner, played by the model, scored by both real judges.
const level = programme.levels.find((l) => l.id === req.sampleLevel) ?? programme.levels[0]
const turns: Turn[] = [{ speaker: 'persona', text: level.opening, atMs: 0, mood: level.moodStart }]
let state = { mood: level.moodStart, revealed: [] as string[] }
let at = 0
for (let i = 0; i < 5; i++) {
  const learner = await chatJson(meta, {
    model: MUSE,
    system: `You play a ${programme.learnerRole} in a training role-play who is decent but not perfect: you get most things right but forget one important thing from this list: ${programme.rubric.filter((r) => r.mustHave).map((r) => r.text).join('; ')}. Speak ${programme.language}, one to three natural spoken sentences. Reply ONLY with JSON: {"say": "<your words>"}`,
    user: turns.map((t) => `${t.speaker === 'persona' ? programme.persona.name : 'You'}: ${t.text}`).join('\n'),
    schema: z.object({ say: z.string().min(1) }),
    effort: 'minimal',
  })
  at += 6000 + learner.say.length * 60
  turns.push({ speaker: 'learner', text: learner.say, atMs: at, mood: null })
  const reply = await personaTurn(meta, { programme, level, turns, revealed: state.revealed, mood: state.mood })
  const applied = applyReply(state, reply, level, programme.persona)
  state = { mood: applied.mood, revealed: applied.revealed }
  at += 3000 + applied.say.length * 50
  turns.push({ speaker: 'persona', text: applied.say, atMs: at, mood: applied.mood })
  if (reply.hangUp) break
}
const verdicts = await scoreCall({ meta, open: baseten, store: openStore(':memory:') }, { hash: 'seed', programme }, turns)
log('sample call scored', verdicts.map((v) => `${v.lineId}:${v.result}`).join(' '), verdicts[0]?.judge2)

const out = { caseId, request: req.text, files, match, brief, programme, testCall, sampleCall: { level: level.id, learner: req.learner, turns, verdicts } }
writeFileSync(new URL(`../apps/server/seeds/library/${caseId}.json`, import.meta.url), `${JSON.stringify(out, null, 2)}\n`)
log('written')
