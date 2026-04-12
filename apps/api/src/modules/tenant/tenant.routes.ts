import type { FastifyInstance } from 'fastify'
import { authenticate } from '../auth/auth.middleware.js'
import { requireSuperAdmin } from '../auth/auth.hooks.js'
import {
  CreateTenantSchema,
  UpdateTenantSchema,
  TenantIdParamSchema,
  CreateContactSchema,
  UpdateContactSchema,
  ContactParamSchema,
  CreateSpecialtySchema,
  UpdateSpecialtySchema,
  SpecialtyParamSchema,
} from './tenant.schema.js'
import * as tenantService from './tenant.service.js'

export async function tenantRoutes(app: FastifyInstance) {
  // Auth middleware para todas as rotas deste módulo
  app.addHook('preHandler', authenticate)

  // -----------------------------------------------------------------------
  // Tenants
  // -----------------------------------------------------------------------

  app.get('/tenants', {
    preHandler: [requireSuperAdmin],
  }, async (_request, reply) => {
    const tenants = await tenantService.listTenants()
    return reply.send({ data: tenants })
  })

  app.get<{ Params: { id: string } }>('/tenants/:id', {
    preHandler: [requireSuperAdmin],
  }, async (request, reply) => {
    const params = TenantIdParamSchema.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: params.error.flatten() })

    const tenant = await tenantService.getTenantById(params.data.id)
    return reply.send({ data: tenant })
  })

  app.post('/tenants', {
    preHandler: [requireSuperAdmin],
  }, async (request, reply) => {
    const body = CreateTenantSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    const result = await tenantService.createTenant(body.data)
    return reply.code(201).send({ data: result })
  })

  app.put<{ Params: { id: string } }>('/tenants/:id', {
    preHandler: [requireSuperAdmin],
  }, async (request, reply) => {
    const params = TenantIdParamSchema.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: params.error.flatten() })

    const body = UpdateTenantSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    const tenant = await tenantService.updateTenant(params.data.id, body.data)
    return reply.send({ data: tenant })
  })

  // -----------------------------------------------------------------------
  // Contacts
  // -----------------------------------------------------------------------

  app.get<{ Params: { id: string } }>('/tenants/:id/contacts', {
    preHandler: [requireSuperAdmin],
  }, async (request, reply) => {
    const params = TenantIdParamSchema.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: params.error.flatten() })

    const contacts = await tenantService.listContacts(params.data.id)
    return reply.send({ data: contacts })
  })

  app.post<{ Params: { id: string } }>('/tenants/:id/contacts', {
    preHandler: [requireSuperAdmin],
  }, async (request, reply) => {
    const params = TenantIdParamSchema.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: params.error.flatten() })

    const body = CreateContactSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    const contact = await tenantService.createContact(params.data.id, body.data)
    return reply.code(201).send({ data: contact })
  })

  app.put<{ Params: { id: string; contactId: string } }>(
    '/tenants/:id/contacts/:contactId',
    { preHandler: [requireSuperAdmin] },
    async (request, reply) => {
      const params = ContactParamSchema.safeParse(request.params)
      if (!params.success) return reply.code(400).send({ error: params.error.flatten() })

      const body = UpdateContactSchema.safeParse(request.body)
      if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

      const contact = await tenantService.updateContact(
        params.data.id,
        params.data.contactId,
        body.data,
      )
      return reply.send({ data: contact })
    },
  )

  app.delete<{ Params: { id: string; contactId: string } }>(
    '/tenants/:id/contacts/:contactId',
    { preHandler: [requireSuperAdmin] },
    async (request, reply) => {
      const params = ContactParamSchema.safeParse(request.params)
      if (!params.success) return reply.code(400).send({ error: params.error.flatten() })

      await tenantService.deleteContact(params.data.id, params.data.contactId)
      return reply.code(204).send()
    },
  )

  // -----------------------------------------------------------------------
  // Specialties
  // -----------------------------------------------------------------------

  app.get<{ Params: { id: string } }>('/tenants/:id/specialties', {
    preHandler: [requireSuperAdmin],
  }, async (request, reply) => {
    const params = TenantIdParamSchema.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: params.error.flatten() })

    const specialties = await tenantService.listSpecialties(params.data.id)
    return reply.send({ data: specialties })
  })

  app.post<{ Params: { id: string } }>('/tenants/:id/specialties', {
    preHandler: [requireSuperAdmin],
  }, async (request, reply) => {
    const params = TenantIdParamSchema.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: params.error.flatten() })

    const body = CreateSpecialtySchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    const specialty = await tenantService.createSpecialty(params.data.id, body.data)
    return reply.code(201).send({ data: specialty })
  })

  app.put<{ Params: { id: string; specId: string } }>(
    '/tenants/:id/specialties/:specId',
    { preHandler: [requireSuperAdmin] },
    async (request, reply) => {
      const params = SpecialtyParamSchema.safeParse(request.params)
      if (!params.success) return reply.code(400).send({ error: params.error.flatten() })

      const body = UpdateSpecialtySchema.safeParse(request.body)
      if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

      const specialty = await tenantService.updateSpecialty(
        params.data.id,
        params.data.specId,
        body.data,
      )
      return reply.send({ data: specialty })
    },
  )

  app.delete<{ Params: { id: string; specId: string } }>(
    '/tenants/:id/specialties/:specId',
    { preHandler: [requireSuperAdmin] },
    async (request, reply) => {
      const params = SpecialtyParamSchema.safeParse(request.params)
      if (!params.success) return reply.code(400).send({ error: params.error.flatten() })

      await tenantService.deleteSpecialty(params.data.id, params.data.specId)
      return reply.code(204).send()
    },
  )
}
