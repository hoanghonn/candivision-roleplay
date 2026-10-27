import type { CaseId } from './types'

export type CaseTemplate = {
  id: CaseId
  name: string
  extraInputs: string[]
  counterpart: string
  /** method library slugs the research starts from */
  methodSeeds: string[]
  readyLooksLike: string[]
  reportedResult: string[]
  groundingNote: string
}

const LEARN = ['deliberate-practice', 'feedback-power']

export const CASES: Record<CaseId, CaseTemplate> = {
  outage_call: {
    id: 'outage_call',
    name: 'Outage call to an angry client',
    extraInputs: ['incident report', 'client emails', 'status-update rules'],
    counterpart: "The client's head of operations: worried, then angry; at the hardest level a director joins.",
    methodSeeds: ['service-recovery', 'apology-structure', 'incident-comms', ...LEARN],
    readyLooksLike: ['Owns the problem early', 'Explains impact without jargon', 'Gives a time for the next update', 'Never blames the client'],
    reportedResult: ['escalations', 'post-incident satisfaction'],
    groundingNote: 'Mostly research and proven incident practice.',
  },
  sales_onboarding: {
    id: 'sales_onboarding',
    name: 'Sales onboarding',
    extraInputs: ['sales playbook', 'product facts', 'a good call', 'top objections'],
    counterpart: 'A prospect with budget and a doubt.',
    methodSeeds: ['spin', 'active-listening', 'implementation-intentions', 'behaviour-modelling'],
    readyLooksLike: ['Finds needs before pitching', 'Handles the top 3 objections', 'Agrees a next step'],
    reportedResult: ['certification pass rate', 'ramp time'],
    groundingNote: "The customer's own sales method comes first when they upload it.",
  },
  customer_service: {
    id: 'customer_service',
    name: 'Customer service and call centre',
    extraInputs: ['complaint types', 'policies', 'scripts'],
    counterpart: 'An upset customer: a billing error, a delay or a refused refund.',
    methodSeeds: ['service-recovery', 'complaint-justice', 'active-listening', 'recovery-paradox'],
    readyLooksLike: ['Acknowledges the problem', 'Follows policy', 'Resolves or escalates', 'Keeps the call short'],
    reportedResult: ['customer satisfaction', 'first-call resolution', 'escalations'],
    groundingNote: 'Research on complaints plus the customer\'s own policies.',
  },
  partner_certification: {
    id: 'partner_certification',
    name: 'Partner certification',
    extraInputs: ['pitch deck', 'product facts', 'pricing rules', 'competitor sheet'],
    counterpart: "A buyer weighing the partner's offer.",
    methodSeeds: ['spin', 'behaviour-modelling', 'training-transfer'],
    readyLooksLike: ['Gets the facts right', 'Fits the pitch to the need', 'Makes no false claims'],
    reportedResult: ['certified partners', 'partner pipeline'],
    groundingNote: "Mostly the customer's own material, and the programme says so.",
  },
  manager_conversations: {
    id: 'manager_conversations',
    name: "Managers' hard conversations",
    extraInputs: ['company values', 'review process', 'typical situations'],
    counterpart: 'A defensive, upset or disengaged employee.',
    methodSeeds: ['sbi', 'crucial-conversations', 'feedback-interventions', 'active-listening'],
    readyLooksLike: ['Talks about behaviour, not the person', 'Listens', 'Agrees next steps'],
    reportedResult: ['engagement survey items', 'confidence before and after (weaker evidence)'],
    groundingNote: 'Research and well-known practitioner models, credited.',
  },
  regulated_messaging: {
    id: 'regulated_messaging',
    name: 'Regulated message delivery',
    extraInputs: ['approved claims', 'banned phrases', 'the regulation'],
    counterpart: 'A doctor or customer pushing off-label or risky questions.',
    methodSeeds: ['compliance-first', 'behaviour-modelling', 'spaced-practice'],
    readyLooksLike: ['Makes zero unapproved claims', 'Gives correct safety information', 'Redirects off-label questions'],
    reportedResult: ['compliance pass rate', 'audit findings'],
    groundingNote: 'The regulation and the customer\'s approved claims come before papers.',
  },
  generic: {
    id: 'generic',
    name: 'Other conversation',
    extraInputs: ['any material that shows the situation'],
    counterpart: 'The other person in the conversation the request describes.',
    methodSeeds: ['deliberate-practice', 'feedback-power', 'debriefing', 'behaviour-modelling'],
    readyLooksLike: [],
    reportedResult: [],
    groundingNote: 'Research is searched live for this request.',
  },
}
