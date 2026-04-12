import type { FastifyRequest, FastifyReply } from 'fastify'
import { verifyApiKey } from '../modules/patient/patient.service.js'
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

  // Preencher campos obrigatórios do tipo FastifyRequest augmentado
  request.tenantId = result.tenantId
  request.userId = 'external'
  request.userEmail = 'external'
  request.userRole = 'secretary' // role mínimo; externo não é usuário do sistema
}
