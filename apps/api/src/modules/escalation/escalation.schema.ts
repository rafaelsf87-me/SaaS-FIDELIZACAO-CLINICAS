import { z } from 'zod'

export const KeywordCategorySchema = z.enum([
  'emergency',
  'clinical',
  'commercial',
  'optout',
  'operational',
])

export const KeywordModeSchema = z.enum(['immediate', 'conversational'])

export const CreateEscalationKeywordSchema = z.object({
  keyword: z.string().min(1, 'Keyword obrigatória'),
  category: KeywordCategorySchema,
  mode: KeywordModeSchema.default('immediate'),
  priority: z.number().int().min(1).max(5).default(3),
  active: z.boolean().optional(),
})

export const UpdateEscalationKeywordSchema = CreateEscalationKeywordSchema.partial()

export const EscalationKeywordIdParamSchema = z.object({
  id: z.string().uuid('ID inválido'),
})

export type CreateEscalationKeywordInput = z.infer<typeof CreateEscalationKeywordSchema>
export type UpdateEscalationKeywordInput = z.infer<typeof UpdateEscalationKeywordSchema>
