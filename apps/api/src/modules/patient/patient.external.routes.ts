import type { FastifyInstance } from 'fastify'
import { authenticateApiKey } from '../../shared/apiKey.middleware.js'
import { ExternalCreatePatientSchema } from './patient.schema.js'
import * as patientService from './patient.service.js'

/**
 * Rotas para integração externa (Doctoralia, iClinic, Shosp, etc.).
 * Autenticação via X-API-Key por tenant — sem JWT Supabase.
 * Pacientes criados aqui sempre recebem status 'review'.
 */
export async function patientExternalRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticateApiKey)

  app.post('/external/patients', async (request, reply) => {
    const tenantId = request.tenantId
    if (!tenantId) {
      return reply.code(401).send({ error: 'Tenant não identificado' })
    }

    const body = ExternalCreatePatientSchema.safeParse(request.body)
    if (!body.success) {
      return reply.code(400).send({ error: body.error.flatten() })
    }

    try {
      const patient = await patientService.createPatientExternal(tenantId, body.data)
      return reply.code(201).send({ data: patient })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar paciente'
      const status = message.includes('CPF já cadastrado') ? 409 : 500
      return reply.code(status).send({ error: message })
    }
  })
}
