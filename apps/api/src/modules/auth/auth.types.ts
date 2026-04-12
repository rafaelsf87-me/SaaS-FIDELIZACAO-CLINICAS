import type { UserRole } from '@crm/shared'

// Augmenta o FastifyRequest com campos do usuário autenticado
declare module 'fastify' {
  interface FastifyRequest {
    userId: string
    userEmail: string
    userRole: UserRole
    tenantId: string | null
  }
}
