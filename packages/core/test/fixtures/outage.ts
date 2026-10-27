import type { FileText, Programme, ResearchBrief } from '../../src/types'

/** One valid outage-call programme with its brief and customer file, reused across tests. */
export const outageFiles: FileText[] = [
  {
    id: 'f1',
    name: 'client-email-thread.txt',
    text: 'From: Tanaka. This is the second outage this month. Our warehouses stopped for two hours and nobody told us when it would be fixed.',
  },
]

export const outageBrief: ResearchBrief = {
  sources: [
    { id: 'M:apology-structure', kind: 'method', title: 'An exploration of the structure of effective apologies', authors: 'Lewicki, Polin and Lount', year: 2016, link: 'https://doi.org/10.1111/ncmr.12073', summary: 'Apologies work better with more of their parts; taking responsibility matters most.' },
    { id: 'M:incident-comms', kind: 'method', title: 'PagerDuty Incident Response documentation', authors: 'PagerDuty', year: null, link: 'https://response.pagerduty.com/', summary: 'Status updates say what is affected, what is being done and when the next update comes.' },
    { id: 'M:deliberate-practice', kind: 'method', title: 'The role of deliberate practice in the acquisition of expert performance', authors: 'Ericsson, Krampe and Tesch-Römer', year: 1993, link: 'https://doi.org/10.1037/0033-295X.100.3.363', summary: 'Skill grows through focused, repeated practice on weak parts with feedback.' },
  ],
  items: [
    { sourceId: 'M:apology-structure', gives: 'Take responsibility early and plainly.', use: 'handle' },
    { sourceId: 'M:incident-comms', gives: 'Give impact, action and the next update time.', use: 'handle' },
    { sourceId: 'M:deliberate-practice', gives: 'Raise difficulty in steps and drill the weak part.', use: 'learn' },
  ],
  notFound: ['No reliable source on Japanese client expectations for outage apologies.'],
}

export const outageProgramme: Programme = {
  title: 'The outage call',
  caseId: 'outage_call',
  language: 'en',
  learnerRole: 'Engineer on call',
  persona: {
    name: 'Tanaka',
    role: 'Head of Operations at the client',
    voice: 'man',
    style: 'Direct, short sentences, impatient with technical detail.',
    facts: [{ id: 'h1', fact: 'The CEO has already asked Tanaka for a written explanation.', earnedBy: 'The engineer takes responsibility without excuses.' }],
    redLines: ['Never calms down before hearing a time for the next update.'],
    portraitPrompt: 'Middle-aged operations manager at a desk, serious expression, office background.',
  },
  skills: [
    { id: 's1', name: 'Own it and apologise', why: 'Responsibility is the strongest part of an apology.', sources: ['M:apology-structure'], excerpts: [] },
    { id: 's2', name: 'Next update time', why: 'Clients need to know when they will hear more.', sources: ['M:incident-comms'], excerpts: [{ fileId: 'f1', quote: 'nobody told us when it would be fixed' }] },
  ],
  levels: [
    { id: 'L1', title: 'Worried client', situation: 'The client is worried and asks questions.', opening: 'What happened to our system?', moodStart: 40, moodFloor: 10, sources: ['M:deliberate-practice'], excerpts: [] },
    { id: 'L2', title: 'Angry client', situation: 'The client is angry and interrupts.', opening: 'This is the second time this month.', moodStart: 75, moodFloor: 40, sources: ['M:deliberate-practice'], excerpts: [] },
  ],
  rubric: [
    { id: 'r1', skillId: 's1', text: 'Says sorry and takes responsibility in the first minute.', mustHave: true, lookFor: 'A plain apology that owns the problem.', tryThis: 'Start with: I am sorry, this is on us.', sources: ['M:apology-structure'], excerpts: [] },
    { id: 'r2', skillId: 's2', text: 'Gives a time for the next update.', mustHave: true, lookFor: 'A specific time or interval.', tryThis: 'Say: I will call you again at 3 pm with an update.', sources: ['M:incident-comms'], excerpts: [] },
    { id: 'r3', skillId: 's2', text: 'Explains impact without jargon.', mustHave: false, lookFor: 'Plain words about what stopped working.', tryThis: 'Say what the client could not do, not what the database did.', sources: ['M:incident-comms'], excerpts: [] },
  ],
  instructions: 'You are the engineer on call. Call the client about this morning\'s outage.',
  keywords: ['Tanaka', 'warehouse', 'outage'],
}
