import type { FastifyInstance } from 'fastify'
import { authenticate } from '../auth/auth.middleware.js'
import { requireClinicUser } from '../auth/auth.hooks.js'
import { requireTenant } from '../../shared/getCurrentTenant.js'
import { serviceError } from '../../shared/routeHelpers.js'
import {
  ListPatientsQuerySchema,
  CreatePatientSchema,
  UpdatePatientSchema,
  UpdatePatientStatusSchema,
  PatientIdParamSchema,
} from './patient.schema.js'
import * as patientService from './patient.service.js'

export async function patientRoutes(app: FastifyInstance) {
  // Todas as rotas requerem usuário autenticado e role de clínica
  app.addHook('preHandler', authenticate)
  app.addHook('preHandler', requireClinicUser)

  // -----------------------------------------------------------------------
  // GET /patients
  // -----------------------------------------------------------------------

  app.get('/patients', async (request, reply) => {
    const tenantId = requireTenant(request)
    const query = ListPatientsQuerySchema.safeParse(request.query)
    if (!query.success) return reply.code(400).send({ error: query.error.flatten() })

    try {
      const result = await patientService.listPatients(tenantId, query.data)
      return reply.send(result)
    } catch (err) { return serviceError(err, reply) }
  })

  // -----------------------------------------------------------------------
  // GET /patients/:id
  // -----------------------------------------------------------------------

  app.get<{ Params: { id: string } }>('/patients/:id', async (request, reply) => {
    const tenantId = requireTenant(request)
    const params = PatientIdParamSchema.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: params.error.flatten() })

    try {
      const patient = await patientService.getPatientById(tenantId, params.data.id)
      return reply.send({ data: patient })
    } catch (err) { return serviceError(err, reply) }
  })

  // -----------------------------------------------------------------------
  // POST /patients
  // -----------------------------------------------------------------------

  app.post('/patients', async (request, reply) => {
    const tenantId = requireTenant(request)
    const body = CreatePatientSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    try {
      const patient = await patientService.createPatient(tenantId, body.data)
      return reply.code(201).send({ data: patient })
    } catch (err) { return serviceError(err, reply) }
  })

  // -----------------------------------------------------------------------
  // PUT /patients/:id
  // -----------------------------------------------------------------------

  app.put<{ Params: { id: string } }>('/patients/:id', async (request, reply) => {
    const tenantId = requireTenant(request)
    const params = PatientIdParamSchema.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: params.error.flatten() })

    const body = UpdatePatientSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    try {
      const patient = await patientService.updatePatient(tenantId, params.data.id, body.data)
      return reply.send({ data: patient })
    } catch (err) { return serviceError(err, reply) }
  })

  // -----------------------------------------------------------------------
  // PATCH /patients/:id/status
  // Endpoint dedicado para a secretária alterar só o status do paciente
  // -----------------------------------------------------------------------

  app.patch<{ Params: { id: string } }>('/patients/:id/status', async (request, reply) => {
    const tenantId = requireTenant(request)
    const params = PatientIdParamSchema.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: params.error.flatten() })

    const body = UpdatePatientStatusSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    try {
      const patient = await patientService.updatePatient(tenantId, params.data.id, body.data)
      return reply.send({ data: patient })
    } catch (err) { return serviceError(err, reply) }
  })

  // -----------------------------------------------------------------------
  // DELETE /patients/:id — soft delete (enabled = false)
  // -----------------------------------------------------------------------

  app.delete<{ Params: { id: string } }>('/patients/:id', async (request, reply) => {
    const tenantId = requireTenant(request)
    const params = PatientIdParamSchema.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: params.error.flatten() })

    try {
      await patientService.softDeletePatient(tenantId, params.data.id)
      return reply.code(204).send()
    } catch (err) { return serviceError(err, reply) }
  })
}
