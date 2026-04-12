import crypto from 'node:crypto'
import { getSupabaseClient } from '../infra/supabase.js'

/**
 * Verifica uma API key raw contra os hashes armazenados em tenant_api_keys.
 * Retorna o tenantId associado se válida e ativa, ou null.
 */
export async function verifyApiKey(rawKey: string): Promise<{ tenantId: string } | null> {
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('tenant_api_keys')
    .select('tenant_id')
    .eq('key_hash', keyHash)
    .eq('active', true)
    .single()

  if (error || !data) return null

  // Atualizar last_used_at de forma assíncrona sem bloquear a resposta
  void supabase
    .from('tenant_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('key_hash', keyHash)

  return { tenantId: data.tenant_id }
}
