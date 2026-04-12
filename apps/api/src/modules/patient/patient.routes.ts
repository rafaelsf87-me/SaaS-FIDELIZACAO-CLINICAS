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
import * as documentService from './patient.document.service.js'

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
  // PATCH /patients/:id/opportunity/resolve
  // Secretária marca oportunidade como resolvida (reseta flag + detalhe)
  // -----------------------------------------------------------------------

  app.patch<{ Params: { id: string } }>('/patients/:id/opportunity/resolve', async (request, reply) => {
    const tenantId = requireTenant(request)
    const params = PatientIdParamSchema.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: params.error.flatten() })

    try {
      const patient = await patientService.resolveOpportunity(tenantId, params.data.id)
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

  // -----------------------------------------------------------------------
  // GET /patients/:id/documents
  // -----------------------------------------------------------------------

  app.get<{ Params: { id: string } }>('/patients/:id/documents', async (request, reply) => {
    const tenantId = requireTenant(request)
    const params = PatientIdParamSchema.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: params.error.flatten() })

    try {
      const documents = await documentService.listDocuments(tenantId, params.data.id)
      return reply.send({ data: documents })
    } catch (err) { return serviceError(err, reply) }
  })

  // -----------------------------------------------------------------------
  // POST /patients/:id/documents — upload + trigger Agent 1
  // -----------------------------------------------------------------------

  app.post<{ Params: { id: string } }>('/patients/:id/documents', async (request, reply) => {
    const tenantId = requireTenant(request)
    const params = PatientIdParamSchema.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: params.error.flatten() })

    try {
      const data = await request.file()
      if (!data) return reply.code(400).send({ error: 'Arquivo não enviado' })

      const buffer = await data.toBuffer()
      const document = await documentService.uploadDocument(
        tenantId,
        params.data.id,
        buffer,
        data.filename,
        data.mimetype,
      )
      return reply.code(201).send({ data: document })
    } catch (err) { return serviceError(err, reply) }
  })

  // -----------------------------------------------------------------------
  // PATCH /patients/:id/documents/:docId — ativar/desativar documento
  // -----------------------------------------------------------------------

  app.patch<{ Params: { id: string; docId: string } }>(
    '/patients/:id/documents/:docId',
    async (request, reply) => {
      const tenantId = requireTenant(request)
      const params = PatientIdParamSchema.safeParse(request.params)
      if (!params.success) return reply.code(400).send({ error: params.error.flatten() })

      const body = request.body as { is_active?: boolean }
      if (typeof body.is_active !== 'boolean') {
        return reply.code(400).send({ error: 'Campo is_active (boolean) é obrigatório' })
      }

      try {
        const doc = await documentService.toggleDocument(
          tenantId,
          params.data.id,
          (request.params as { docId: string }).docId,
          body.is_active,
        )
        return reply.send({ data: doc })
      } catch (err) { return serviceError(err, reply) }
    },
  )
}
