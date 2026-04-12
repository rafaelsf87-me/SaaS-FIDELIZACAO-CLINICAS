import { getSupabaseClient } from '../../infra/supabase.js'
import type {
  CreateFollowupScenarioInput,
  UpdateFollowupScenarioInput,
} from './followup.schema.js'

// -----------------------------------------------------------------------
// List — globais (tenant_id IS NULL) + customizados do tenant
// -----------------------------------------------------------------------

export async function listFollowupScenarios(tenantId: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('followup_scenarios')
    .select('*')
    .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
    .order('is_default', { ascending: false })
    .order('name')
  if (error) throw new Error(error.message)
  return data ?? []
}

// -----------------------------------------------------------------------
// Create — sempre scoped ao tenant
// -----------------------------------------------------------------------

export async function createFollowupScenario(
  tenantId: string,
  input: CreateFollowupScenarioInput,
) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('followup_scenarios')
    .insert({ ...input, tenant_id: tenantId, is_default: false })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

// -----------------------------------------------------------------------
// Update — só cenários do próprio tenant (não globais)
// -----------------------------------------------------------------------

export async function updateFollowupScenario(
  tenantId: string,
  scenarioId: string,
  input: UpdateFollowupScenarioInput,
) {
  const supabase = getSupabaseClient()
  // Verificar que o cenário pertence ao tenant (não é global)
  const { data: existing, error: checkErr } = await supabase
    .from('followup_scenarios')
    .select('id, tenant_id, is_default')
    .eq('id', scenarioId)
    .single()
  if (checkErr || !existing) throw new Error('Cenário não encontrado')
  if (existing.tenant_id !== tenantId) throw new Error('Cenário não encontrado')

  const { data, error } = await supabase
    .from('followup_scenarios')
    .update(input)
    .eq('id', scenarioId)
    .eq('tenant_id', tenantId)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

// -----------------------------------------------------------------------
// Delete — só cenários do tenant e que não são is_default
// -----------------------------------------------------------------------

export async function deleteFollowupScenario(tenantId: string, scenarioId: string) {
  const supabase = getSupabaseClient()
  const { data: existing, error: checkErr } = await supabase
    .from('followup_scenarios')
    .select('id, tenant_id, is_default')
    .eq('id', scenarioId)
    .single()
  if (checkErr || !existing) throw new Error('Cenário não encontrado')
  if (existing.tenant_id !== tenantId) throw new Error('Cenário não encontrado')
  if (existing.is_default) throw new Error('Cenários padrão não podem ser removidos')

  const { error } = await supabase
    .from('followup_scenarios')
    .delete()
    .eq('id', scenarioId)
    .eq('tenant_id', tenantId)
  if (error) throw new Error(error.message)
}
