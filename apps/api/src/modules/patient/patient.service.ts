import { getSupabaseClient } from '../../infra/supabase.js'
import type {
  ListPatientsQuery,
  CreatePatientInput,
  UpdatePatientInput,
  ExternalCreatePatientInput,
} from './patient.schema.js'

// Strip non-digits from CPF/phone so storage is always clean
function stripNonDigits(value: string): string {
  return value.replace(/\D/g, '')
}

// -----------------------------------------------------------------------
// List
// -----------------------------------------------------------------------

export async function listPatients(tenantId: string, query: ListPatientsQuery) {
  const supabase = getSupabaseClient()
  const { search, status, page, limit } = query
  const from = (page - 1) * limit
  const to = from + limit - 1

  let q = supabase
    .from('patients')
    .select(
      'id, cpf, name, first_name, phone_whatsapp, health_plan, status, recurrence_flag, opportunity_flag, opportunity_detail, last_interaction_at, created_at',
      { count: 'exact' },
    )
    .eq('tenant_id', tenantId)
    .eq('enabled', true)
    .order('name')
    .range(from, to)

  if (status) {
    q = q.eq('status', status)
  }

  if (search) {
    // Sanitize: remove PostgREST meta-chars ( , ( ) ` ) to prevent filter injection
    const safeName = search.replace(/[,()`]/g, '').slice(0, 100)
    const cpfDigits = search.replace(/\D/g, '').slice(0, 11)
    if (cpfDigits.length >= 3) {
      // Both name and CPF fragment search — safe because cpfDigits is digits-only
      q = q.or(`name.ilike.%${safeName}%,cpf.ilike.%${cpfDigits}%`)
    } else {
      q = q.ilike('name', `%${safeName}%`)
    }
  }

  const { data, error, count } = await q
  if (error) throw new Error(error.message)
  return { data: data ?? [], total: count ?? 0, page, limit }
}

// -----------------------------------------------------------------------
// Get by ID
// -----------------------------------------------------------------------

export async function getPatientById(tenantId: string, patientId: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', patientId)
    .eq('tenant_id', tenantId)
    .single()
  if (error) throw new Error(error.message)
  return data
}

// -----------------------------------------------------------------------
// Insert helper (shared between createPatient and createPatientExternal)
// -----------------------------------------------------------------------

async function _insertPatient(
  tenantId: string,
  input: CreatePatientInput | ExternalCreatePatientInput,
  status: 'active' | 'review',
) {
  const supabase = getSupabaseClient()
  const cpf = stripNonDigits(input.cpf)
  const phone = stripNonDigits(input.phone_whatsapp)

  const { data, error } = await supabase
    .from('patients')
    .insert({ ...input, cpf, phone_whatsapp: phone, tenant_id: tenantId, status })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') throw new Error('CPF já cadastrado nesta clínica')
    throw new Error(error.message)
  }
  return data
}

// -----------------------------------------------------------------------
// Create (manual — status 'active')
// -----------------------------------------------------------------------

export async function createPatient(tenantId: string, input: CreatePatientInput) {
  return _insertPatient(tenantId, input, 'active')
}

// -----------------------------------------------------------------------
// Update
// -----------------------------------------------------------------------

export async function updatePatient(
  tenantId: string,
  patientId: string,
  input: UpdatePatientInput,
) {
  const supabase = getSupabaseClient()

  const payload: Record<string, unknown> = { ...input }
  if (input.cpf) payload.cpf = stripNonDigits(input.cpf)
  if (input.phone_whatsapp) payload.phone_whatsapp = stripNonDigits(input.phone_whatsapp)

  const { data, error } = await supabase
    .from('patients')
    .update(payload)
    .eq('id', patientId)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') throw new Error('CPF já cadastrado nesta clínica')
    throw new Error(error.message)
  }
  return data
}

// -----------------------------------------------------------------------
// Resolve opportunity — reseta flag e detalhe para null/false
// -----------------------------------------------------------------------

export async function resolveOpportunity(tenantId: string, patientId: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('patients')
    .update({ opportunity_flag: false, opportunity_detail: null })
    .eq('id', patientId)
    .eq('tenant_id', tenantId)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

// -----------------------------------------------------------------------
// Soft delete
// -----------------------------------------------------------------------

export async function softDeletePatient(tenantId: string, patientId: string) {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('patients')
    .update({ enabled: false })
    .eq('id', patientId)
    .eq('tenant_id', tenantId)
  if (error) throw new Error(error.message)
}

// -----------------------------------------------------------------------
// Create external (via API key — status always 'review')
// -----------------------------------------------------------------------

export async function createPatientExternal(
  tenantId: string,
  input: ExternalCreatePatientInput,
) {
  return _insertPatient(tenantId, input, 'review')
}

