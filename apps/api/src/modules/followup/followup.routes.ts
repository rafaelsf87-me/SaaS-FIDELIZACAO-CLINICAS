import type { FastifyInstance } from 'fastify'
import { authenticate } from '../auth/auth.middleware.js'
import { requireClinicUser } from '../auth/auth.hooks.js'
import { requireTenant } from '../../shared/getCurrentTenant.js'
import { serviceError } from '../../shared/routeHelpers.js'
import {
  CreateFollowupScenarioSchema,
  UpdateFollowupScenarioSchema,
  FollowupScenarioIdParamSchema,
} from './followup.schema.js'
import * as followupService from './followup.service.js'

export async function followupRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)
  app.addHook('preHandler', requireClinicUser)

  // -----------------------------------------------------------------------
  // GET /followup-scenarios — globais + customizados do tenant
  // -----------------------------------------------------------------------

  app.get('/followup-scenarios', async (request, reply) => {
    const tenantId = requireTenant(request)
    try {
      const scenarios = await followupService.listFollowupScenarios(tenantId)
      return reply.send({ data: scenarios })
    } catch (err) { return serviceError(err, reply) }
  })

  // -----------------------------------------------------------------------
  // POST /followup-scenarios
  // -----------------------------------------------------------------------

  app.post('/followup-scenarios', async (request, reply) => {
    const tenantId = requireTenant(request)
    const body = CreateFollowupScenarioSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    try {
      const scenario = await followupService.createFollowupScenario(tenantId, body.data)
      return reply.code(201).send({ data: scenario })
    } catch (err) { return serviceError(err, reply) }
  })

  // -----------------------------------------------------------------------
  // PUT /followup-scenarios/:id
  // -----------------------------------------------------------------------

  app.put<{ Params: { id: string } }>('/followup-scenarios/:id', async (request, reply) => {
    const tenantId = requireTenant(request)
    const params = FollowupScenarioIdParamSchema.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: params.error.flatten() })

    const body = UpdateFollowupScenarioSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    try {
      const scenario = await followupService.updateFollowupScenario(tenantId, params.data.id, body.data)
      return reply.send({ data: scenario })
    } catch (err) { return serviceError(err, reply) }
  })

  // -----------------------------------------------------------------------
  // DELETE /followup-scenarios/:id
  // -----------------------------------------------------------------------

  app.delete<{ Params: { id: string } }>('/followup-scenarios/:id', async (request, reply) => {
    const tenantId = requireTenant(request)
    const params = FollowupScenarioIdParamSchema.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: params.error.flatten() })

    try {
      await followupService.deleteFollowupScenario(tenantId, params.data.id)
      return reply.code(204).send()
    } catch (err) { return serviceError(err, reply) }
  })
}
