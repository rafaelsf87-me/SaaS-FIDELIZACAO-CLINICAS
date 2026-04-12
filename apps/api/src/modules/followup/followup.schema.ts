import { z } from 'zod'

export const TriggerTypeSchema = z.enum(['medication', 'exam', 'return', 'custom'])

export const CreateFollowupScenarioSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  trigger_type: TriggerTypeSchema,
  interval_days: z.number().int().positive('Intervalo deve ser positivo'),
  repeat_every_days: z.number().int().positive().nullable().optional(),
  max_repeats: z.number().int().min(1).default(1),
  message_template: z.string().nullable().optional(),
  active: z.boolean().optional(),
})

export const UpdateFollowupScenarioSchema = CreateFollowupScenarioSchema.partial()

export const FollowupScenarioIdParamSchema = z.object({
  id: z.string().uuid('ID inválido'),
})

export type CreateFollowupScenarioInput = z.infer<typeof CreateFollowupScenarioSchema>
export type UpdateFollowupScenarioInput = z.infer<typeof UpdateFollowupScenarioSchema>
