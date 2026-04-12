import { getSupabaseClient } from '../../infra/supabase.js'
import type {
  CreateEscalationKeywordInput,
  UpdateEscalationKeywordInput,
} from './escalation.schema.js'

// -----------------------------------------------------------------------
// List — globais (tenant_id IS NULL) + customizadas do tenant
// -----------------------------------------------------------------------

export async function listEscalationKeywords(tenantId: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('escalation_keywords')
    .select('*')
    .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
    .order('is_default', { ascending: false })
    .order('priority', { ascending: true })
    .order('keyword')
  if (error) throw new Error(error.message)
  return data ?? []
}

// -----------------------------------------------------------------------
// Create — sempre scoped ao tenant
// -----------------------------------------------------------------------

export async function createEscalationKeyword(
  tenantId: string,
  input: CreateEscalationKeywordInput,
) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('escalation_keywords')
    .insert({ ...input, tenant_id: tenantId, is_default: false })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

// -----------------------------------------------------------------------
// Update — só keywords do próprio tenant
// -----------------------------------------------------------------------

export async function updateEscalationKeyword(
  tenantId: string,
  keywordId: string,
  input: UpdateEscalationKeywordInput,
) {
  const supabase = getSupabaseClient()
  const { data: existing, error: checkErr } = await supabase
    .from('escalation_keywords')
    .select('id, tenant_id')
    .eq('id', keywordId)
    .single()
  if (checkErr || !existing) throw new Error('Keyword não encontrada')
  if (existing.tenant_id !== tenantId) throw new Error('Keyword não encontrada')

  const { data, error } = await supabase
    .from('escalation_keywords')
    .update(input)
    .eq('id', keywordId)
    .eq('tenant_id', tenantId)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

// -----------------------------------------------------------------------
// Delete — só keywords do tenant
// -----------------------------------------------------------------------

export async function deleteEscalationKeyword(tenantId: string, keywordId: string) {
  const supabase = getSupabaseClient()
  const { data: existing, error: checkErr } = await supabase
    .from('escalation_keywords')
    .select('id, tenant_id, is_default')
    .eq('id', keywordId)
    .single()
  if (checkErr || !existing) throw new Error('Keyword não encontrada')
  if (existing.tenant_id !== tenantId) throw new Error('Keyword não encontrada')
  if (existing.is_default) throw new Error('Keywords padrão não podem ser removidas')

  const { error } = await supabase
    .from('escalation_keywords')
    .delete()
    .eq('id', keywordId)
    .eq('tenant_id', tenantId)
  if (error) throw new Error(error.message)
}
