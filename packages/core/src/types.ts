import { z } from 'zod'

export const CASE_IDS = ['outage_call', 'sales_onboarding', 'customer_service', 'partner_certification', 'manager_conversations', 'regulated_messaging', 'generic'] as const
export const CaseIdSchema = z.enum(CASE_IDS)
export type CaseId = z.infer<typeof CaseIdSchema>

export const LanguageSchema = z.enum(['en', 'vi', 'ja'])
export type Language = z.infer<typeof LanguageSchema>

/** A source the research tools returned. Ids: 'M:<slug>' for the method library, 'P:<doi>' for papers. */
export const SourceSchema = z.object({
  id: z.string().regex(/^(M|P):.+/),
  kind: z.enum(['method', 'paper']),
  title: z.string().min(1),
  authors: z.string(),
  year: z.number().int().nullable(),
  link: z.string().url(),
  summary: z.string(),
})
export type Source = z.infer<typeof SourceSchema>

export const BriefItemSchema = z.object({ sourceId: z.string(), gives: z.string().min(1), use: z.enum(['handle', 'learn']) })
export type BriefItem = z.infer<typeof BriefItemSchema>

export const ResearchBriefSchema = z.object({ sources: z.array(SourceSchema), items: z.array(BriefItemSchema), notFound: z.array(z.string()) })
export type ResearchBrief = z.infer<typeof ResearchBriefSchema>

export const ExcerptSchema = z.object({ fileId: z.string(), quote: z.string() })
export type Excerpt = z.infer<typeof ExcerptSchema>

const grounded = { sources: z.array(z.string()), excerpts: z.array(ExcerptSchema) }

export const SkillSchema = z.object({ id: z.string(), name: z.string().min(1), why: z.string(), ...grounded })
export type Skill = z.infer<typeof SkillSchema>

export const HiddenFactSchema = z.object({ id: z.string(), fact: z.string().min(1), earnedBy: z.string().min(1) })
export type HiddenFact = z.infer<typeof HiddenFactSchema>

export const VoiceIdSchema = z.enum(['woman', 'man', 'older_man'])
export type VoiceId = z.infer<typeof VoiceIdSchema>

export const PersonaSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  voice: VoiceIdSchema,
  style: z.string(),
  facts: z.array(HiddenFactSchema),
  redLines: z.array(z.string()),
  portraitPrompt: z.string(),
})
export type Persona = z.infer<typeof PersonaSchema>

const mood = z.number().min(0).max(100)
export const LevelSchema = z.object({
  id: z.enum(['L1', 'L2', 'L3']),
  title: z.string().min(1),
  situation: z.string().min(1),
  opening: z.string().min(1),
  moodStart: mood,
  moodFloor: mood,
  ...grounded,
})
export type Level = z.infer<typeof LevelSchema>

export const RubricLineSchema = z.object({
  id: z.string(),
  skillId: z.string(),
  text: z.string().min(1),
  mustHave: z.boolean(),
  lookFor: z.string(),
  tryThis: z.string(),
  ...grounded,
})
export type RubricLine = z.infer<typeof RubricLineSchema>

export const ProgrammeSchema = z.object({
  title: z.string().min(1),
  caseId: CaseIdSchema,
  language: LanguageSchema,
  learnerRole: z.string().min(1),
  persona: PersonaSchema,
  skills: z.array(SkillSchema).min(1),
  levels: z.array(LevelSchema).min(2).max(3),
  rubric: z.array(RubricLineSchema).min(1),
  instructions: z.string(),
  keywords: z.array(z.string()).max(30),
})
export type Programme = z.infer<typeof ProgrammeSchema>

export const CaseMatchSchema = z.object({
  caseId: CaseIdSchema,
  situation: z.string(),
  learnerRole: z.string(),
  counterpartRole: z.string(),
  language: LanguageSchema,
  stakes: z.string(),
  readyMeans: z.array(z.string()),
})
export type CaseMatch = z.infer<typeof CaseMatchSchema>

export const DeclinedSchema = z.object({ declined: z.literal('screening'), reason: z.string() })
export type Declined = z.infer<typeof DeclinedSchema>

export const TurnSchema = z.object({ speaker: z.enum(['learner', 'persona']), text: z.string(), atMs: z.number(), mood: z.number().nullable() })
export type Turn = z.infer<typeof TurnSchema>

export const LineResultSchema = z.enum(['pass', 'partly', 'missed'])
export type LineResult = z.infer<typeof LineResultSchema>

export const ReadingSchema = z.object({ lineId: z.string(), result: LineResultSchema, turn: z.number().int().nullable(), quote: z.string() })
export type Reading = z.infer<typeof ReadingSchema>

export const VerdictSchema = z.object({
  lineId: z.string(),
  result: z.union([LineResultSchema, z.literal('unsure')]),
  readings: z.tuple([ReadingSchema.nullable(), ReadingSchema.nullable()]),
  judge2: z.enum(['baseten', 'muse_fallback']),
  settled: LineResultSchema.nullable(),
})
export type Verdict = z.infer<typeof VerdictSchema>

export type FileText = { id: string; name: string; text: string }
export type Problem = { path: string; message: string }
