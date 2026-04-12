import type { FastifyRequest, FastifyReply } from 'fastify'
import { getSupabaseClient } from '../../infra/supabase.js'
import './auth.types.js'

/**
 * preHandler que valida o JWT do Supabase, busca o perfil do usuário
 * e popula request.userId / userEmail / userRole / tenantId.
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'Token não fornecido' })
  }

  const token = authHeader.slice(7)
  const supabase = getSupabaseClient()

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) {
    return reply.code(401).send({ error: 'Token inválido ou expirado' })
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return reply.code(401).send({ error: 'Perfil de usuário não encontrado' })
  }

  request.userId = user.id
  request.userEmail = user.email ?? ''
  request.userRole = profile.role as import('@crm/shared').UserRole
  request.tenantId = profile.tenant_id ?? null
}
