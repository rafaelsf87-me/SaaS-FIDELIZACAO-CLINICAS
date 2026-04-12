import { z } from 'zod'

export const ConversationStatusSchema = z.enum(['active', 'closed', 'escalated'])

// -----------------------------------------------------------------------
// Query
// -----------------------------------------------------------------------

export const ListConversationsQuerySchema = z.object({
  status: ConversationStatusSchema.optional(),
  patient: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const ListMessagesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

// -----------------------------------------------------------------------
// Mutation
// -----------------------------------------------------------------------

export const UpdateConversationStatusSchema = z.object({
  status: z.enum(['active', 'closed']),
})

export const ConversationIdParamSchema = z.object({
  id: z.string().uuid('ID de conversa inválido'),
})

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

export type ListConversationsQuery = z.infer<typeof ListConversationsQuerySchema>
export type ListMessagesQuery = z.infer<typeof ListMessagesQuerySchema>
export type UpdateConversationStatusInput = z.infer<typeof UpdateConversationStatusSchema>
