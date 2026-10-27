import { normalize } from './text'
import type { Source } from './types'

// Links last checked with scripts/check-library.ts on 2026-10-27: all OK.

/**
 * Our own vetted library of proven methods. Every summary is written in our own words; nothing is pasted
 * from the papers or from branded course material. Links are checked by scripts/check-library.ts.
 */
export type MethodEntry = {
  slug: string
  title: string
  authors: string
  year: number | null
  doi: string | null
  link: string
  summary: string
  gives: string[]
  tags: string[]
  use: 'handle' | 'learn'
}

const doi = (d: string) => ({ doi: d, link: `https://doi.org/${d}` })

export const METHODS: MethodEntry[] = [
  {
    slug: 'service-recovery',
    title: 'A model of customer satisfaction with service encounters involving failure and recovery',
    authors: 'Smith, Bolton and Wagner',
    year: 1999,
    ...doi('10.2307/3152082'),
    summary: 'Customers judge a recovery on three kinds of fairness: what they get back, how quickly and smoothly it is handled, and how they are treated. The best recovery matches the kind and size of the failure; an apology and a fast response matter most when the failure is about the process.',
    gives: ['Apologise and act fast.', 'Match what you offer to the size of the loss.', 'Treat the person with respect throughout.'],
    tags: ['service failure', 'recovery', 'complaint', 'angry', 'customer', 'client', 'outage', 'apology', 'compensation'],
    use: 'handle',
  },
  {
    slug: 'complaint-justice',
    title: 'Customer evaluations of service complaint experiences: implications for relationship marketing',
    authors: 'Tax, Brown and Chandrashekaran',
    year: 1998,
    ...doi('10.1177/002224299806200205'),
    summary: 'A study of how customers judge the handling of their complaints. They look at a fair outcome, a fair process (timely, flexible, easy to follow) and fair treatment (courtesy, honesty, empathy, effort). All three shape trust and commitment afterwards.',
    gives: ['Explain what will happen and when.', 'Be honest and courteous, and show effort.', 'Make the outcome fair for the loss.'],
    tags: ['complaint', 'customer', 'fairness', 'call centre', 'refund', 'billing', 'service', 'trust'],
    use: 'handle',
  },
  {
    slug: 'recovery-paradox',
    title: 'Service recovery paradox: a meta-analysis',
    authors: 'de Matos, Henrique and Rossi',
    year: 2007,
    ...doi('10.1177/1094670507303012'),
    summary: 'Pooling many studies, a very good recovery can lift satisfaction above what it would have been with no failure, but it does not reliably lift loyalty, repurchase or word of mouth. A strong recovery helps; it does not make a failure worthwhile.',
    gives: ['Do not promise that things will be better than before.', 'Focus on preventing a repeat.'],
    tags: ['service failure', 'recovery', 'satisfaction', 'loyalty', 'customer', 'repeat'],
    use: 'handle',
  },
  {
    slug: 'apology-structure',
    title: 'An exploration of the structure of effective apologies',
    authors: 'Lewicki, Polin and Lount',
    year: 2016,
    ...doi('10.1111/ncmr.12073'),
    summary: 'Two experiments on which parts of an apology matter. Apologies with more parts were judged more effective. Taking responsibility mattered most, then offering to repair; asking for forgiveness mattered least.',
    gives: ['Take responsibility plainly.', 'Offer to repair the damage.', 'Do not lean on asking for forgiveness.'],
    tags: ['apology', 'sorry', 'responsibility', 'trust', 'angry', 'client', 'repair'],
    use: 'handle',
  },
  {
    slug: 'incident-comms',
    title: 'PagerDuty Incident Response documentation',
    authors: 'PagerDuty',
    year: null,
    doi: null,
    link: 'https://response.pagerduty.com/',
    summary: 'An openly published guide to running major incidents. It gives one person the job of communicating with stakeholders, and status updates that say what is affected, what is being done, and when the next update will come.',
    gives: ['Say the impact in plain words.', 'Say what is being done now.', 'Give a time for the next update and keep it.'],
    tags: ['incident', 'outage', 'downtime', 'status update', 'client', 'engineer', 'on call'],
    use: 'handle',
  },
  {
    slug: 'spin',
    title: 'SPIN Selling',
    authors: 'Rackham',
    year: 1988,
    doi: null,
    link: 'https://www.huthwaiteinternational.com/spin-selling',
    summary: 'From observation of many sales calls, larger sales were won by asking about the buyer\'s situation, problems, the implications of those problems and the value of solving them, before presenting a solution.',
    gives: ['Ask about needs before pitching.', 'Explore what the problem costs the buyer.', 'Let the buyer say the value in their own words.'],
    tags: ['sales', 'selling', 'prospect', 'buyer', 'questions', 'discovery', 'pitch', 'objection'],
    use: 'handle',
  },
  {
    slug: 'sbi',
    title: 'Situation-Behavior-Impact feedback model',
    authors: 'Center for Creative Leadership',
    year: null,
    doi: null,
    link: 'https://www.ccl.org/articles/leading-effectively-articles/closing-the-gap-between-intent-vs-impact-sbii/',
    summary: 'A feedback model from the Center for Creative Leadership: describe when and where it happened, the specific behaviour you saw, and the impact it had, rather than judging the person. We use the idea with credit; we do not reproduce their materials.',
    gives: ['Name the situation.', 'Describe the behaviour, not the person.', 'Say the impact it had.'],
    tags: ['feedback', 'manager', 'employee', 'performance', 'conversation', 'behaviour'],
    use: 'handle',
  },
  {
    slug: 'crucial-conversations',
    title: 'Crucial Conversations: Tools for Talking When Stakes Are High',
    authors: 'Patterson, Grenny, McMillan and Switzler',
    year: 2002,
    doi: null,
    link: 'https://cruciallearning.com/crucial-conversations-book/',
    summary: 'A widely used practitioner book on high-stakes conversations where opinions differ and emotions run high. Its core ideas are keeping the conversation safe for both sides, sharing facts before conclusions, and inviting the other view.',
    gives: ['Keep it safe for both sides.', 'Start with facts, then your view.', 'Ask for their view and mean it.'],
    tags: ['difficult conversation', 'manager', 'employee', 'conflict', 'defensive', 'emotions'],
    use: 'handle',
  },
  {
    slug: 'feedback-interventions',
    title: 'The effects of feedback interventions on performance: a historical review, a meta-analysis, and a preliminary feedback intervention theory',
    authors: 'Kluger and DeNisi',
    year: 1996,
    ...doi('10.1037/0033-2909.119.2.254'),
    summary: 'A large meta-analysis: feedback improves performance on average, but in over a third of cases it made performance worse. Feedback that turns attention to the person rather than the task tends to do harm.',
    gives: ['Keep feedback on the task.', 'Avoid comments about the person.'],
    tags: ['feedback', 'performance', 'manager', 'employee', 'coaching'],
    use: 'learn',
  },
  {
    slug: 'active-listening',
    title: 'The relative effectiveness of active listening in initial interactions',
    authors: 'Weger, Castle Bell, Minei and Robinson',
    year: 2014,
    ...doi('10.1080/10904018.2013.813234'),
    summary: 'In an experiment, people whose concerns were paraphrased back to them felt more understood than people who got simple acknowledgements or advice.',
    gives: ['Paraphrase the concern before answering.', 'Check you understood it.'],
    tags: ['listening', 'empathy', 'customer', 'employee', 'upset', 'complaint', 'conversation', 'angry'],
    use: 'handle',
  },
  {
    slug: 'compliance-first',
    title: 'IFPMA Code of Practice 2019',
    authors: 'International Federation of Pharmaceutical Manufacturers and Associations',
    year: 2019,
    doi: null,
    link: 'https://www.ifpma.org/publications/ifpma-code-of-practice-2019/',
    summary: 'The international industry code for how pharmaceutical companies promote medicines to health professionals: information must be accurate, balanced and consistent with the approved product information. For regulated messaging, the customer\'s own approved claims and the regulation they upload come first.',
    gives: ['Use only approved claims.', 'Give safety information when benefits come up.', 'Redirect off-label questions to the right channel.'],
    tags: ['regulated', 'compliance', 'claims', 'doctor', 'pharma', 'off label', 'safety', 'regulation'],
    use: 'handle',
  },
  {
    slug: 'implementation-intentions',
    title: 'Implementation intentions and goal achievement: a meta-analysis of effects and processes',
    authors: 'Gollwitzer and Sheeran',
    year: 2006,
    ...doi('10.1016/S0065-2601(06)38002-1'),
    summary: 'A meta-analysis showing that concrete if-then plans (when X happens, I will do Y) help people follow through on goals much more than intentions alone.',
    gives: ['End with a concrete next step: who, what and when.'],
    tags: ['next step', 'follow up', 'commitment', 'plan', 'sales', 'agreement'],
    use: 'handle',
  },
  {
    slug: 'deliberate-practice',
    title: 'The role of deliberate practice in the acquisition of expert performance',
    authors: 'Ericsson, Krampe and Tesch-Römer',
    year: 1993,
    ...doi('10.1037/0033-295X.100.3.363'),
    summary: 'Expert performance grows through focused practice on specific weak points, with immediate feedback and repetition, at a difficulty just beyond current ability.',
    gives: ['Practise the weak part in short repeats.', 'Raise the difficulty in steps.'],
    tags: ['practice', 'drill', 'levels', 'difficulty', 'expert', 'repetition'],
    use: 'learn',
  },
  {
    slug: 'feedback-power',
    title: 'The power of feedback',
    authors: 'Hattie and Timperley',
    year: 2007,
    ...doi('10.3102/003465430298487'),
    summary: 'A review of feedback in learning. Useful feedback answers where am I going, how am I going, and where to next, and works at the level of the task and the process, not praise of the person.',
    gives: ['Say what the goal was, how it went and the next step.', 'Point at the task, not the person.'],
    tags: ['feedback', 'debrief', 'learning', 'next step'],
    use: 'learn',
  },
  {
    slug: 'debriefing',
    title: 'There\'s no such thing as "nonjudgmental" debriefing: a theory and method for debriefing with good judgment',
    authors: 'Rudolph, Simon, Dufresne and Raemer',
    year: 2006,
    ...doi('10.1097/01266021-200600110-00006'),
    summary: 'A method for debriefing simulations: state what you observed and what you think of it, then ask about the learner\'s reasoning, so the debrief changes how they think, not just what they did.',
    gives: ['Point to the exact moment.', 'Ask why they chose it.'],
    tags: ['debrief', 'simulation', 'feedback', 'reflection'],
    use: 'learn',
  },
  {
    slug: 'self-explanation',
    title: 'Inducing self-explanation: a meta-analysis',
    authors: 'Bisra, Liu, Nesbit, Salimi and Winne',
    year: 2018,
    ...doi('10.1007/s10648-018-9434-x'),
    summary: 'Across many studies, prompting learners to explain to themselves why something works improves learning compared with not prompting them.',
    gives: ['Ask the learner to say why the better answer works.'],
    tags: ['explanation', 'learning', 'reflection', 'debrief'],
    use: 'learn',
  },
  {
    slug: 'behaviour-modelling',
    title: 'A meta-analytic review of behavior modeling training',
    authors: 'Taylor, Russ-Eft and Chan',
    year: 2005,
    ...doi('10.1037/0021-9010.90.4.692'),
    summary: 'Training that shows a model of the behaviour and then has people practise it works, especially for knowledge and skills. Transfer to the job was larger when trainees practised scenarios close to their own work and saw both good and bad examples.',
    gives: ['Practise on scenarios from the learner\'s own work.', 'Show good and bad examples.'],
    tags: ['role play', 'training', 'practice', 'skills', 'scenario', 'modelling', 'transfer'],
    use: 'learn',
  },
  {
    slug: 'simulation-games',
    title: 'A meta-analytic examination of the instructional effectiveness of computer-based simulation games',
    authors: 'Sitzmann',
    year: 2011,
    ...doi('10.1111/j.1744-6570.2011.01190.x'),
    summary: 'Learners trained with simulation games had higher self-efficacy, knowledge and retention than comparison groups, especially when the simulation was active and learners could repeat it as often as they wanted.',
    gives: ['Let learners retry as often as they want.', 'Keep the learner active, not watching.'],
    tags: ['simulation', 'game', 'practice', 'retention', 'role play'],
    use: 'learn',
  },
  {
    slug: 'spaced-practice',
    title: 'Distributed practice in verbal recall tasks: a review and quantitative synthesis',
    authors: 'Cepeda, Pashler, Vul, Wixted and Rohrer',
    year: 2006,
    ...doi('10.1037/0033-2909.132.3.354'),
    summary: 'Spreading practice over time leads to better long-term recall than massing it in one session.',
    gives: ['Spread retries over days rather than one sitting.'],
    tags: ['spacing', 'retention', 'practice', 'memory', 'compliance'],
    use: 'learn',
  },
  {
    slug: 'training-transfer',
    title: 'Transfer of training: a meta-analytic review',
    authors: 'Blume, Ford, Baldwin and Huang',
    year: 2010,
    ...doi('10.1177/0149206309352880'),
    summary: 'Whether training is used on the job depends on the learner\'s motivation and on a supportive work environment, especially for open skills like conversations, not only on the training itself.',
    gives: ['Tie practice to a gate the manager cares about.', 'Make the work environment support the new behaviour.'],
    tags: ['transfer', 'training', 'workplace', 'manager', 'partner'],
    use: 'learn',
  },
  {
    slug: 'kirkpatrick',
    title: 'The Kirkpatrick Model of training evaluation',
    authors: 'Kirkpatrick Partners',
    year: null,
    doi: null,
    link: 'https://www.kirkpatrickpartners.com/the-kirkpatrick-model/',
    summary: 'Four levels for judging training: reaction, learning, behaviour on the job and results. A role-play pass shows learning; behaviour and results need evidence from the job.',
    gives: ['Report learning honestly and do not claim job results from practice alone.'],
    tags: ['evaluation', 'report', 'results', 'training'],
    use: 'learn',
  },
]

const STOP = new Set(['the', 'and', 'for', 'with', 'after', 'about', 'our', 'their', 'they', 'when', 'from', 'that', 'this', 'into', 'how', 'who', 'are', 'was'])
const words = (s: string) => normalize(s).split(' ').filter((w) => w.length >= 3 && !STOP.has(w)).map((w) => w.replace(/s$/, ''))

/** The library entries that best match a topic: tag words count twice, title words once. */
export function findMethods(topic: string, limit = 5): MethodEntry[] {
  const q = new Set(words(topic))
  if (q.size === 0) return []
  const scored = METHODS.map((m, i) => {
    const tagWords = new Set(m.tags.flatMap(words))
    const titleWords = new Set(words(m.title))
    let score = 0
    for (const w of q) score += (tagWords.has(w) ? 2 : 0) + (titleWords.has(w) ? 1 : 0)
    return { m, i, score }
  })
  return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score || a.i - b.i).slice(0, limit).map((s) => s.m)
}

export function methodSource(m: MethodEntry): Source {
  return { id: `M:${m.slug}`, kind: 'method', title: m.title, authors: m.authors, year: m.year, link: m.link, summary: m.summary }
}
