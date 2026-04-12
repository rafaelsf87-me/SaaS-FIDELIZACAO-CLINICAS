import type { FastifyReply } from 'fastify'

/**
 * Mapeia erros do service para status HTTP e encerra a resposta.
 * Mensagens técnicas do banco (raw Supabase errors) são suprimidas
 * quando o erro não é de domínio conhecido — o cliente recebe apenas
 * a mensagem de erro de negócio ou uma mensagem genérica.
 */
export function serviceError(err: unknown, reply: FastifyReply): never {
  const msg = err instanceof Error ? err.message : 'Erro interno'
  const status =
    msg.includes('não encontrado') || msg.includes('não encontrada') ? 404
    : msg.includes('já cadastrado') || msg.includes('conflict') ? 409
    : msg.includes('não está associado') || msg.includes('sem clínica') ? 403
    : 500
  const clientMsg = status === 500 ? 'Erro interno do servidor' : msg
  return reply.code(status).send({ error: clientMsg }) as never
}
