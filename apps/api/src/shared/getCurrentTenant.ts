import type { FastifyRequest } from 'fastify'
import '../modules/auth/auth.types.js'

/**
 * Retorna o tenant_id do usuário autenticado.
 * Retorna null para super_admin (não tem tenant).
 */
export function getCurrentTenant(request: FastifyRequest): string | null {
  return request.tenantId ?? null
}

/**
 * Retorna o tenant_id ou lança 403 se o usuário não tiver tenant.
 * Usar em endpoints que exigem contexto de clínica.
 */
export function requireTenant(request: FastifyRequest): string {
  const tenantId = request.tenantId
  if (!tenantId) {
    throw new Error('Usuário não está associado a nenhuma clínica')
  }
  return tenantId
}
