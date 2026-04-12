import type { FastifyRequest, FastifyReply } from 'fastify'
import type { UserRole } from '@crm/shared'
import './auth.types.js'

/**
 * Retorna um preHandler que exige que o usuário tenha um dos roles permitidos.
 * Deve ser usado APÓS o middleware `authenticate`.
 */
export function requireRole(...roles: UserRole[]) {
  return async function (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    if (!roles.includes(request.userRole)) {
      return reply.code(403).send({
        error: 'Acesso negado',
        required: roles,
        current: request.userRole,
      })
    }
  }
}

export const requireSuperAdmin = requireRole('super_admin')
export const requireClinicUser = requireRole('super_admin', 'admin', 'secretary')
export const requireAdmin = requireRole('super_admin', 'admin')
