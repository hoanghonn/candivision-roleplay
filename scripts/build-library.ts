// Builds one ready-built programme with the real pipeline and writes apps/server/seeds/library/<caseId>.json.
// Run: NODE_OPTIONS=--experimental-sqlite npx tsx --env-file=.env scripts/build-library.ts outage_call
// A language version: add the variant, as in `... outage_call vi`, which writes <caseId>.vi.json from <caseId>.vi.* source files.
// A programme that shares its case type with another names that type in `caseId`; its key is then its own name (slug),
// used for its file names and its programme id.
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

type BuildRequest = { text: string; sampleLevel: string; learner: string; caseId?: CaseId }

const REQUESTS: Record<string, BuildRequest> = {
  bank_insurance_sale: {
    caseId: 'regulated_messaging',
    text: "Our bank branch staff sell a 10-year life insurance plan to customers whose term deposits are maturing, and too many customers cancel in the first year because they thought they had bought savings. Staff call it a savings product, skip what happens if the customer cancels early, and sometimes hint it helps with a loan. I want them to practise with a cautious customer in her fifties. Ready means the learner says plainly that it is insurance and not a deposit, gives the yearly premium, the 10-year term and the early-cancellation loss, checks the customer can afford it and won't need the money, never links it to a loan, and offers to let her take the papers home.",
    sampleLevel: 'L1',
    learner: 'Sample learner',
  },
  bank_scam_stop: {
    caseId: 'customer_service',
    text: "Customers come to our branch counters to pay a fee so they can receive a large transfer from overseas, or to move savings because someone claiming to be the police told them to. Our tellers either process it without a question or lecture the customer, who then gets defensive and pays through another channel. I want them to practise a calm conversation with a customer who is convinced it is real. Ready means the teller pauses the payment, asks open questions, names the warning sign without calling the customer foolish, explains how a real transfer works, gets the customer to agree to call the bank's own hotline first, and never promises to recover money already lost.",
    sampleLevel: 'L1',
    learner: 'Sample learner',
  },
  site_safety_stop: {
    caseId: 'manager_conversations',
    text: "Our site foremen see experienced workers unclipping their harness or skipping a step to finish on time, and they either say nothing or shout and walk off, so the same shortcut happens again the next day. I want them to practise stopping the work and having a short conversation that fixes the reason behind the shortcut. Ready means the foreman stops the task and makes it safe first, describes the exact behaviour and the risk without blaming the person, asks why it happened, agrees one fix with an owner and a time, and never threatens the worker's pay or job.",
    sampleLevel: 'L1',
    learner: 'Sample foreman',
  },
  er_wait_relative: {
    caseId: 'customer_service',
    text: "In our emergency department, relatives come to the nurses' desk angry that their family member has waited an hour while others walked straight in. Our nurses and reception staff answer 'just wait' or 'that's the rule', and some situations turn into shouting or worse. I want them to practise calming a worried relative. Ready means the learner acknowledges the worry, explains in plain words that the sickest patients are seen first and that their relative has been assessed, asks whether anything has changed and escalates if it has, promises a specific time for the next update instead of a doctor's time, and never gives a diagnosis or says 'it's nothing serious'.",
    sampleLevel: 'L1',
    learner: 'Sample learner',
  },
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

// A language version has its own request and source files, and becomes its own programme.
const REQUESTS_VI: Record<string, BuildRequest> = {
  bank_insurance_sale: {
    caseId: 'regulated_messaging',
    text: "Nhân viên chi nhánh ngân hàng của chúng tôi bán gói bảo hiểm nhân thọ 10 năm cho khách có sổ tiết kiệm sắp đáo hạn, và rất nhiều khách hủy ngay trong năm đầu vì tưởng mình mua tiết kiệm. Nhân viên gọi đây là sản phẩm tiết kiệm, bỏ qua chuyện hủy sớm sẽ mất tiền, có khi còn ngầm nói mua thì dễ được vay hơn. Tôi muốn họ luyện tư vấn cho một khách hàng ngoài năm mươi tuổi, rất thận trọng. Đạt yêu cầu là học viên nói rõ đây là bảo hiểm chứ không phải tiền gửi, nêu mức phí mỗi năm, thời hạn 10 năm và khoản mất nếu hủy sớm, hỏi để chắc khách đóng được và sẽ không cần rút tiền, không bao giờ gắn với khoản vay, và mời khách mang hồ sơ về nhà đọc.",
    sampleLevel: 'L1',
    learner: 'Học viên mẫu',
  },
  bank_scam_stop: {
    caseId: 'customer_service',
    text: "Khách hàng đến quầy giao dịch của chúng tôi để đóng phí nhận một khoản tiền lớn chuyển từ nước ngoài, hoặc để chuyển tiền tiết kiệm vì có người tự xưng là công an yêu cầu. Giao dịch viên hoặc làm luôn mà không hỏi gì, hoặc giảng giải khiến khách tự ái rồi chuyển qua kênh khác. Tôi muốn họ luyện cách nói chuyện bình tĩnh với một khách hàng đang tin chắc mọi chuyện là thật. Đạt yêu cầu là giao dịch viên tạm dừng giao dịch, hỏi mở, chỉ ra dấu hiệu lừa đảo mà không chê khách dại, giải thích khoản chuyển tiền thật diễn ra thế nào, thuyết phục khách gọi tổng đài của ngân hàng trước, và không hứa lấy lại số tiền đã mất.",
    sampleLevel: 'L1',
    learner: 'Học viên mẫu',
  },
  site_safety_stop: {
    caseId: 'manager_conversations',
    text: "Tổ trưởng ở công trường của chúng tôi thấy công nhân lâu năm tháo móc dây an toàn hoặc bỏ bớt bước để kịp tiến độ, nhưng hoặc làm ngơ, hoặc quát một câu rồi đi, nên hôm sau lại làm tắt y như cũ. Tôi muốn họ luyện cách dừng việc và nói chuyện ngắn gọn để xử lý đúng lý do khiến công nhân làm tắt. Đạt yêu cầu là tổ trưởng dừng việc và làm cho khu vực an toàn trước, nói rõ hành vi và mối nguy mà không trách con người, hỏi vì sao, thống nhất một cách khắc phục có người làm và hạn xong, và không đe dọa trừ lương hay đuổi việc.",
    sampleLevel: 'L1',
    learner: 'Tổ trưởng mẫu',
  },
  er_wait_relative: {
    caseId: 'customer_service',
    text: "Ở khoa cấp cứu của chúng tôi, người nhà thường đến quầy điều dưỡng bức xúc vì người thân chờ cả tiếng mà người khác đến sau lại được vào trước. Điều dưỡng và nhân viên tiếp đón chỉ nói 'chờ đi' hoặc 'quy định là vậy', và có lúc thành to tiếng hoặc tệ hơn. Tôi muốn họ luyện cách làm dịu một người nhà đang lo lắng. Đạt yêu cầu là học viên ghi nhận nỗi lo, giải thích bằng lời dễ hiểu rằng người bệnh nặng nhất được khám trước và người thân của họ đã được phân loại, hỏi xem tình trạng có gì thay đổi và báo ngay nếu có, hẹn một giờ cụ thể để quay lại báo tin thay vì hứa giờ bác sĩ đến, và không chẩn đoán hay nói 'không sao đâu'.",
    sampleLevel: 'L1',
    learner: 'Học viên mẫu',
  },
  outage_call: {
    text: 'Khi hệ thống gặp sự cố, kỹ sư của chúng tôi gọi cho khách hàng và mọi chuyện càng tệ hơn. Họ giải thích nguyên nhân kỹ thuật quá dài, không hề xin lỗi, và không đưa ra được thời điểm cập nhật tiếp theo. Tháng trước một khách hàng ở Osaka đã báo thẳng lên giám đốc điều hành của chúng tôi. Đạt nghĩa là: họ nhận trách nhiệm ngay trong phút đầu, giải thích tác động bằng lời đơn giản và luôn đưa ra thời điểm cập nhật tiếp theo. Toàn bộ cuộc gọi diễn ra bằng tiếng Việt.',
    sampleLevel: 'L2',
    learner: 'Học viên mẫu',
  },
  sales_onboarding: {
    text: 'Nhân viên bán hàng mới tại công ty phần mềm nhân sự của chúng tôi bắt đầu demo tính năng ngay trong phút đầu của cuộc gọi tìm hiểu nhu cầu, và chịu thua ngay khi khách phản đối về giá. Đạt nghĩa là: họ tìm ra hai nhu cầu trước khi demo, xử lý được ba phản đối hàng đầu trong sổ tay bán hàng, và luôn chốt được bước tiếp theo.',
    sampleLevel: 'L1',
    learner: 'Học viên mẫu',
  },
  partner_certification: {
    text: 'Các đối tác bán lại của chúng tôi ở Đông Nam Á báo sai giá và hứa những tính năng chúng tôi không có khi giới thiệu sản phẩm sao lưu đám mây. Trước khi được bán, đối tác phải vượt qua một cuộc gọi với người mua: đúng thông tin và giá, giới thiệu phù hợp với nhu cầu của người mua, và không có khẳng định sai.',
    sampleLevel: 'L1',
    learner: 'Đối tác mẫu',
  },
  manager_conversations: {
    text: 'Các quản lý kỹ thuật mới của chúng tôi né tránh những cuộc trò chuyện khó. Khi một kỹ sư cấp cao liên tục trễ hạn review code và tỏ ra phòng thủ, họ hoặc im lặng hoặc biến chuyện thành vấn đề cá nhân. Chúng tôi muốn họ nói về hành vi và tác động của nó, lắng nghe, và thống nhất các bước tiếp theo.',
    sampleLevel: 'L1',
    learner: 'Quản lý mẫu',
  },
  regulated_messaging: {
    text: 'Trình dược viên của chúng tôi trao đổi với bác sĩ về một loại thuốc huyết áp. Bác sĩ thường hỏi về việc dùng thuốc ngoài chỉ định được duyệt, và trình dược viên tự ứng biến. Họ phải bám sát các thông tin được duyệt, nêu thông tin an toàn mỗi khi nói về lợi ích, và chuyển các câu hỏi ngoài chỉ định cho bộ phận Thông tin Y khoa.',
    sampleLevel: 'L1',
    learner: 'Trình dược viên mẫu',
  },
}

const slug = process.argv[2]
const variant = process.argv[3] as 'vi' | undefined
const req = variant === 'vi' ? REQUESTS_VI[slug] : REQUESTS[slug]
if (!req) throw new Error(`unknown programme ${slug}${variant ? ` ${variant}` : ''}`)
const caseId: CaseId = req.caseId ?? (slug as CaseId)
const t0 = Date.now()
const log = (...a: unknown[]) => console.log(`${((Date.now() - t0) / 1000).toFixed(1)}s`, ...a)

const dir = new URL('../apps/server/seeds/library-files/', import.meta.url)
const prefix = variant ? `${slug}.${variant}.` : `${slug}.`
const files: FileText[] = readdirSync(dir)
  .filter((f) => f.startsWith(prefix) && (variant || !f.startsWith(`${slug}.vi.`)))
  .sort()
  .map((f, i) => ({ id: `lib-${slug}${variant ? `-${variant}` : ''}-f${i + 1}`, name: f.slice(prefix.length), text: readFileSync(new URL(f, dir), 'utf8') }))

const matched = await matchCase(meta, req.text, files)
if ('declined' in matched) throw new Error(`declined: ${matched.reason}`)
const match = { ...matched, caseId }
log('matched', match.language, match.situation)
if (variant && match.language !== variant) throw new Error(`asked for ${variant}, matched ${match.language}; run again`)
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
const { verdicts } = await scoreCall({ meta, open: baseten, store: openStore(':memory:') }, { hash: 'seed', programme }, turns)
log('sample call scored', verdicts.map((v) => `${v.lineId}:${v.result}`).join(' '), verdicts[0]?.judge2)

const out = { caseId, ...(slug !== caseId ? { slug } : {}), ...(variant ? { variant } : {}), request: req.text, files, match, brief, programme, testCall, sampleCall: { level: level.id, learner: req.learner, turns, verdicts } }
writeFileSync(new URL(`../apps/server/seeds/library/${slug}${variant ? `.${variant}` : ''}.json`, import.meta.url), `${JSON.stringify(out, null, 2)}\n`)
log('written')
