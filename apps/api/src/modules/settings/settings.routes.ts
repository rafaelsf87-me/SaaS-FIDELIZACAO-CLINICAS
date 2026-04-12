import type { FastifyInstance } from 'fastify'
import { authenticate } from '../auth/auth.middleware.js'
import { requireAdmin, requireClinicUser } from '../auth/auth.hooks.js'
import { requireTenant } from '../../shared/getCurrentTenant.js'
import { serviceError } from '../../shared/routeHelpers.js'
import * as tenantService from '../tenant/tenant.service.js'
import {
  UpdateClinicSettingsSchema,
  CreateContactSchema,
  UpdateContactSchema,
  ContactIdParamSchema,
  CreateSpecialtySchema,
  UpdateSpecialtySchema,
  SpecialtyIdParamSchema,
} from './settings.schema.js'

export async function settingsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  // -----------------------------------------------------------------------
  // GET /settings/clinic — dados do próprio tenant (secretária ou admin)
  // -----------------------------------------------------------------------

  app.get('/settings/clinic', {
    preHandler: [requireClinicUser],
  }, async (request, reply) => {
    const tenantId = requireTenant(request)
    try {
      const tenant = await tenantService.getTenantById(tenantId)
      return reply.send({ data: tenant })
    } catch (err) { return serviceError(err, reply) }
  })

  // -----------------------------------------------------------------------
  // PUT /settings/clinic — apenas admin pode alterar dados da clínica
  // -----------------------------------------------------------------------

  app.put('/settings/clinic', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const tenantId = requireTenant(request)
    const body = UpdateClinicSettingsSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    try {
      const tenant = await tenantService.updateTenant(tenantId, body.data)
      return reply.send({ data: tenant })
    } catch (err) { return serviceError(err, reply) }
  })

  // -----------------------------------------------------------------------
  // GET /settings/contacts
  // -----------------------------------------------------------------------

  app.get('/settings/contacts', {
    preHandler: [requireClinicUser],
  }, async (request, reply) => {
    const tenantId = requireTenant(request)
    try {
      const contacts = await tenantService.listContacts(tenantId)
      return reply.send({ data: contacts })
    } catch (err) { return serviceError(err, reply) }
  })

  // -----------------------------------------------------------------------
  // POST /settings/contacts
  // -----------------------------------------------------------------------

  app.post('/settings/contacts', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const tenantId = requireTenant(request)
    const body = CreateContactSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    try {
      const contact = await tenantService.createContact(tenantId, body.data)
      return reply.code(201).send({ data: contact })
    } catch (err) { return serviceError(err, reply) }
  })

  // -----------------------------------------------------------------------
  // PUT /settings/contacts/:contactId
  // -----------------------------------------------------------------------

  app.put<{ Params: { contactId: string } }>('/settings/contacts/:contactId', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const tenantId = requireTenant(request)
    const params = ContactIdParamSchema.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: params.error.flatten() })

    const body = UpdateContactSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    try {
      const contact = await tenantService.updateContact(tenantId, params.data.contactId, body.data)
      return reply.send({ data: contact })
    } catch (err) { return serviceError(err, reply) }
  })

  // -----------------------------------------------------------------------
  // DELETE /settings/contacts/:contactId
  // -----------------------------------------------------------------------

  app.delete<{ Params: { contactId: string } }>('/settings/contacts/:contactId', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const tenantId = requireTenant(request)
    const params = ContactIdParamSchema.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: params.error.flatten() })

    try {
      await tenantService.deleteContact(tenantId, params.data.contactId)
      return reply.code(204).send()
    } catch (err) { return serviceError(err, reply) }
  })

  // -----------------------------------------------------------------------
  // GET /settings/specialties
  // -----------------------------------------------------------------------

  app.get('/settings/specialties', {
    preHandler: [requireClinicUser],
  }, async (request, reply) => {
    const tenantId = requireTenant(request)
    try {
      const specialties = await tenantService.listSpecialties(tenantId)
      return reply.send({ data: specialties })
    } catch (err) { return serviceError(err, reply) }
  })

  // -----------------------------------------------------------------------
  // POST /settings/specialties
  // -----------------------------------------------------------------------

  app.post('/settings/specialties', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const tenantId = requireTenant(request)
    const body = CreateSpecialtySchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    try {
      const specialty = await tenantService.createSpecialty(tenantId, body.data)
      return reply.code(201).send({ data: specialty })
    } catch (err) { return serviceError(err, reply) }
  })

  // -----------------------------------------------------------------------
  // PUT /settings/specialties/:specId
  // -----------------------------------------------------------------------

  app.put<{ Params: { specId: string } }>('/settings/specialties/:specId', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const tenantId = requireTenant(request)
    const params = SpecialtyIdParamSchema.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: params.error.flatten() })

    const body = UpdateSpecialtySchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    try {
      const specialty = await tenantService.updateSpecialty(tenantId, params.data.specId, body.data)
      return reply.send({ data: specialty })
    } catch (err) { return serviceError(err, reply) }
  })

  // -----------------------------------------------------------------------
  // DELETE /settings/specialties/:specId
  // -----------------------------------------------------------------------

  app.delete<{ Params: { specId: string } }>('/settings/specialties/:specId', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const tenantId = requireTenant(request)
    const params = SpecialtyIdParamSchema.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: params.error.flatten() })

    try {
      await tenantService.deleteSpecialty(tenantId, params.data.specId)
      return reply.code(204).send()
    } catch (err) { return serviceError(err, reply) }
  })
}
