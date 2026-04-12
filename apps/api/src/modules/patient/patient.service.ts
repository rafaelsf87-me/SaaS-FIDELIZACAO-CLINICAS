import crypto from 'node:crypto'
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
      'id, cpf, name, first_name, phone_whatsapp, health_plan, status, recurrence_flag, last_interaction_at, created_at',
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
    const term = search.replace(/\D/g, '')
    // ilike on name OR, if search looks like a CPF fragment, on cpf
    if (term.length >= 3 && /^\d+$/.test(search.replace(/\D/g, ''))) {
      q = q.or(`name.ilike.%${search}%,cpf.ilike.%${term}%`)
    } else {
      q = q.ilike('name', `%${search}%`)
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
// Create (manual — status 'active')
// -----------------------------------------------------------------------

export async function createPatient(tenantId: string, input: CreatePatientInput) {
  const supabase = getSupabaseClient()
  const cpf = stripNonDigits(input.cpf)
  const phone = stripNonDigits(input.phone_whatsapp)

  const { data, error } = await supabase
    .from('patients')
    .insert({
      ...input,
      cpf,
      phone_whatsapp: phone,
      tenant_id: tenantId,
      status: 'active',
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') throw new Error('CPF já cadastrado nesta clínica')
    throw new Error(error.message)
  }
  return data
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
  const supabase = getSupabaseClient()
  const cpf = stripNonDigits(input.cpf)
  const phone = stripNonDigits(input.phone_whatsapp)

  const { data, error } = await supabase
    .from('patients')
    .insert({
      ...input,
      cpf,
      phone_whatsapp: phone,
      tenant_id: tenantId,
      status: 'review', // sempre 'review' para integrações externas
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') throw new Error('CPF já cadastrado nesta clínica')
    throw new Error(error.message)
  }
  return data
}

// -----------------------------------------------------------------------
// API key verification (SHA-256 hash da raw key)
// -----------------------------------------------------------------------

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
