import type { FastifyRequest, FastifyReply } from 'fastify'
import { verifyApiKey } from './apiKey.service.js'
import '../modules/auth/auth.types.js'

/**
 * preHandler para rotas externas autenticadas via X-API-Key.
 * Valida a chave, preenche tenantId no request.
 * Não requer usuário Supabase — o caller é um sistema externo (Doctoralia, iClinic, etc.).
 */
export async function authenticateApiKey(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const rawKey = request.headers['x-api-key']

  if (!rawKey || typeof rawKey !== 'string') {
    return reply.code(401).send({ error: 'X-API-Key não fornecida' })
  }

  const result = await verifyApiKey(rawKey)

  if (!result) {
    return reply.code(401).send({ error: 'API key inválida ou inativa' })
  }

  // 'external_integration' é role runtime-only — nunca armazenado no banco.
  // Garante que essas requisições são rejeitadas por requireClinicUser e requireSuperAdmin.
  request.tenantId = result.tenantId
  request.userId = 'external'
  request.userEmail = 'external'
  request.userRole = 'external_integration'
}
