import { getSupabaseClient } from '../../infra/supabase.js'
import type {
  ListConversationsQuery,
  ListMessagesQuery,
  UpdateConversationStatusInput,
} from './conversation.schema.js'

// -----------------------------------------------------------------------
// List conversations (JOIN patients para trazer nome)
// -----------------------------------------------------------------------

export async function listConversations(tenantId: string, query: ListConversationsQuery) {
  const supabase = getSupabaseClient()
  const { status, patient, page, limit } = query
  const from = (page - 1) * limit
  const to = from + limit - 1

  let q = supabase
    .from('conversations')
    .select(
      `id, status, escalation_reason, escalated_to, last_message_at, created_at, updated_at,
       patient:patients(id, name, first_name, phone_whatsapp)`,
      { count: 'exact' },
    )
    .eq('tenant_id', tenantId)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .range(from, to)

  if (status) {
    q = q.eq('status', status)
  }

  if (patient) {
    q = q.eq('patient_id', patient)
  }

  const { data, error, count } = await q
  if (error) throw new Error(error.message)
  return { data: data ?? [], total: count ?? 0, page, limit }
}

// -----------------------------------------------------------------------
// Get conversation by ID
// -----------------------------------------------------------------------

export async function getConversationById(tenantId: string, conversationId: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      id, status, escalation_reason, escalated_to, last_message_at, created_at, updated_at,
      patient:patients(id, name, first_name, phone_whatsapp, health_plan)
    `)
    .eq('id', conversationId)
    .eq('tenant_id', tenantId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') throw new Error('Conversa não encontrada')
    throw new Error(error.message)
  }
  return data
}

// -----------------------------------------------------------------------
// List messages (ordenado por created_at ASC)
// -----------------------------------------------------------------------

export async function listMessages(
  tenantId: string,
  conversationId: string,
  query: ListMessagesQuery,
) {
  // Verifica ownership: conversa deve pertencer ao tenant antes de expor mensagens
  await getConversationById(tenantId, conversationId)

  const supabase = getSupabaseClient()
  const { page, limit } = query
  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, error, count } = await supabase
    .from('messages')
    .select(
      'id, direction, content, message_type, media_url, audio_transcription, wa_status, ai_intent_detected, created_at',
      { count: 'exact' },
    )
    .eq('conversation_id', conversationId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })
    .range(from, to)

  if (error) throw new Error(error.message)
  return { data: data ?? [], total: count ?? 0, page, limit }
}

// -----------------------------------------------------------------------
// Takeover: secretária assume conversa
// -----------------------------------------------------------------------

export async function takeoverConversation(
  tenantId: string,
  conversationId: string,
  userId: string,
) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('conversations')
    .update({ escalated_to: userId, status: 'escalated' })
    .eq('id', conversationId)
    .eq('tenant_id', tenantId)
    .eq('status', 'active') // Só assume se ainda ativa — previne race condition
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') throw new Error('Conversa não encontrada ou não está ativa')
    throw new Error(error.message)
  }
  return data
}

// -----------------------------------------------------------------------
// Update conversation status (fechar / reabrir)
// -----------------------------------------------------------------------

export async function updateConversationStatus(
  tenantId: string,
  conversationId: string,
  input: UpdateConversationStatusInput,
) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('conversations')
    .update({ status: input.status })
    .eq('id', conversationId)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') throw new Error('Conversa não encontrada')
    throw new Error(error.message)
  }
  return data
}
