import type { FastifyInstance } from 'fastify'
import { authenticate } from '../auth/auth.middleware.js'
import { requireClinicUser } from '../auth/auth.hooks.js'
import { requireTenant } from '../../shared/getCurrentTenant.js'
import { serviceError } from '../../shared/routeHelpers.js'
import {
  ListConversationsQuerySchema,
  ListMessagesQuerySchema,
  UpdateConversationStatusSchema,
  ConversationIdParamSchema,
} from './conversation.schema.js'
import * as conversationService from './conversation.service.js'

export async function conversationRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)
  app.addHook('preHandler', requireClinicUser)

  // -----------------------------------------------------------------------
  // GET /conversations
  // -----------------------------------------------------------------------

  app.get('/conversations', async (request, reply) => {
    const tenantId = requireTenant(request)
    const query = ListConversationsQuerySchema.safeParse(request.query)
    if (!query.success) return reply.code(400).send({ error: query.error.flatten() })

    try {
      const result = await conversationService.listConversations(tenantId, query.data)
      return reply.send(result)
    } catch (err) { return serviceError(err, reply) }
  })

  // -----------------------------------------------------------------------
  // GET /conversations/:id/messages
  // -----------------------------------------------------------------------

  app.get<{ Params: { id: string } }>('/conversations/:id/messages', async (request, reply) => {
    const tenantId = requireTenant(request)
    const params = ConversationIdParamSchema.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: params.error.flatten() })

    const query = ListMessagesQuerySchema.safeParse(request.query)
    if (!query.success) return reply.code(400).send({ error: query.error.flatten() })

    try {
      const result = await conversationService.listMessages(tenantId, params.data.id, query.data)
      return reply.send(result)
    } catch (err) { return serviceError(err, reply) }
  })

  // -----------------------------------------------------------------------
  // POST /conversations/:id/takeover
  // -----------------------------------------------------------------------

  app.post<{ Params: { id: string } }>('/conversations/:id/takeover', async (request, reply) => {
    const tenantId = requireTenant(request)
    const params = ConversationIdParamSchema.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: params.error.flatten() })

    // userId setado pelo middleware authenticate em request.userId
    const userId = request.userId
    if (!userId) return reply.code(401).send({ error: 'Usuário não autenticado' })

    try {
      const conversation = await conversationService.takeoverConversation(
        tenantId,
        params.data.id,
        userId,
      )
      return reply.send({ data: conversation })
    } catch (err) { return serviceError(err, reply) }
  })

  // -----------------------------------------------------------------------
  // PUT /conversations/:id/status
  // -----------------------------------------------------------------------

  app.put<{ Params: { id: string } }>('/conversations/:id/status', async (request, reply) => {
    const tenantId = requireTenant(request)
    const params = ConversationIdParamSchema.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: params.error.flatten() })

    const body = UpdateConversationStatusSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    try {
      const conversation = await conversationService.updateConversationStatus(
        tenantId,
        params.data.id,
        body.data,
      )
      return reply.send({ data: conversation })
    } catch (err) { return serviceError(err, reply) }
  })
}
