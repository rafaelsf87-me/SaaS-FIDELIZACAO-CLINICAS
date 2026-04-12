import type { FastifyInstance } from 'fastify'
import { authenticate } from '../auth/auth.middleware.js'
import { requireClinicUser } from '../auth/auth.hooks.js'
import { requireTenant } from '../../shared/getCurrentTenant.js'
import { serviceError } from '../../shared/routeHelpers.js'
import {
  CreateEscalationKeywordSchema,
  UpdateEscalationKeywordSchema,
  EscalationKeywordIdParamSchema,
} from './escalation.schema.js'
import * as escalationService from './escalation.service.js'

export async function escalationRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)
  app.addHook('preHandler', requireClinicUser)

  // -----------------------------------------------------------------------
  // GET /escalation-keywords — globais + customizadas do tenant
  // -----------------------------------------------------------------------

  app.get('/escalation-keywords', async (request, reply) => {
    const tenantId = requireTenant(request)
    try {
      const keywords = await escalationService.listEscalationKeywords(tenantId)
      return reply.send({ data: keywords })
    } catch (err) { return serviceError(err, reply) }
  })

  // -----------------------------------------------------------------------
  // POST /escalation-keywords
  // -----------------------------------------------------------------------

  app.post('/escalation-keywords', async (request, reply) => {
    const tenantId = requireTenant(request)
    const body = CreateEscalationKeywordSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    try {
      const keyword = await escalationService.createEscalationKeyword(tenantId, body.data)
      return reply.code(201).send({ data: keyword })
    } catch (err) { return serviceError(err, reply) }
  })

  // -----------------------------------------------------------------------
  // PUT /escalation-keywords/:id
  // -----------------------------------------------------------------------

  app.put<{ Params: { id: string } }>('/escalation-keywords/:id', async (request, reply) => {
    const tenantId = requireTenant(request)
    const params = EscalationKeywordIdParamSchema.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: params.error.flatten() })

    const body = UpdateEscalationKeywordSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    try {
      const keyword = await escalationService.updateEscalationKeyword(tenantId, params.data.id, body.data)
      return reply.send({ data: keyword })
    } catch (err) { return serviceError(err, reply) }
  })

  // -----------------------------------------------------------------------
  // DELETE /escalation-keywords/:id
  // -----------------------------------------------------------------------

  app.delete<{ Params: { id: string } }>('/escalation-keywords/:id', async (request, reply) => {
    const tenantId = requireTenant(request)
    const params = EscalationKeywordIdParamSchema.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: params.error.flatten() })

    try {
      await escalationService.deleteEscalationKeyword(tenantId, params.data.id)
      return reply.code(204).send()
    } catch (err) { return serviceError(err, reply) }
  })
}
