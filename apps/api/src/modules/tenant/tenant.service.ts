import { getSupabaseClient } from '../../infra/supabase.js'
import type {
  CreateTenantInput,
  UpdateTenantInput,
  CreateContactInput,
  UpdateContactInput,
  CreateSpecialtyInput,
  UpdateSpecialtyInput,
} from './tenant.schema.js'

// -----------------------------------------------------------------------
// Tenant CRUD
// -----------------------------------------------------------------------

export async function listTenants() {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('tenants')
    .select('id, name, logo_url, description, phone_contact, status, created_at, updated_at')
    .order('name')
  if (error) throw new Error(error.message)
  return data
}

export async function getTenantById(id: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data
}

/**
 * Cria tenant + usuário admin inicial.
 * O trigger create_user_profile() cria o perfil em public.users automaticamente.
 */
export async function createTenant(input: CreateTenantInput) {
  const supabase = getSupabaseClient()

  // 1. Criar tenant
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .insert({
      name: input.name,
      description: input.description ?? null,
      services_description: input.services_description ?? null,
      phone_contact: input.phone_contact ?? null,
      status: 'active',
    })
    .select()
    .single()

  if (tenantError || !tenant) {
    throw new Error(tenantError?.message ?? 'Erro ao criar tenant')
  }

  // 2. Criar usuário admin no Supabase Auth com metadados
  // O trigger create_user_profile() cria o registro em public.users
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: input.admin_email,
    password: input.admin_password,
    email_confirm: true,
    user_metadata: {
      name: input.admin_name,
      role: 'admin',
      tenant_id: tenant.id,
    },
  })

  if (authError || !authUser.user) {
    // Rollback: remover tenant criado
    await supabase.from('tenants').delete().eq('id', tenant.id)
    throw new Error(authError?.message ?? 'Erro ao criar usuário admin')
  }

  // 3. Garantir que o tenant_id foi associado ao usuário
  // (o trigger pode não ter recebido o tenant_id correto se houve race condition)
  const { error: profileUpdateError } = await supabase
    .from('users')
    .update({ tenant_id: tenant.id, role: 'admin' })
    .eq('id', authUser.user.id)

  if (profileUpdateError) {
    console.error('[createTenant] Falha ao associar tenant_id ao perfil do admin:', profileUpdateError.message)
  }

  return { tenant, adminUserId: authUser.user.id }
}

export async function updateTenant(id: string, input: UpdateTenantInput) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('tenants')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

// -----------------------------------------------------------------------
// Contacts
// -----------------------------------------------------------------------

export async function listContacts(tenantId: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('tenant_contacts')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('is_default', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

export async function createContact(tenantId: string, input: CreateContactInput) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('tenant_contacts')
    .insert({ ...input, tenant_id: tenantId })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateContact(
  tenantId: string,
  contactId: string,
  input: UpdateContactInput,
) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('tenant_contacts')
    .update(input)
    .eq('id', contactId)
    .eq('tenant_id', tenantId)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteContact(tenantId: string, contactId: string) {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('tenant_contacts')
    .delete()
    .eq('id', contactId)
    .eq('tenant_id', tenantId)
  if (error) throw new Error(error.message)
}

// -----------------------------------------------------------------------
// Specialties
// -----------------------------------------------------------------------

export async function listSpecialties(tenantId: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('tenant_specialties')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name')
  if (error) throw new Error(error.message)
  return data
}

export async function createSpecialty(tenantId: string, input: CreateSpecialtyInput) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('tenant_specialties')
    .insert({ ...input, tenant_id: tenantId })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateSpecialty(
  tenantId: string,
  specId: string,
  input: UpdateSpecialtyInput,
) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('tenant_specialties')
    .update(input)
    .eq('id', specId)
    .eq('tenant_id', tenantId)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteSpecialty(tenantId: string, specId: string) {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('tenant_specialties')
    .delete()
    .eq('id', specId)
    .eq('tenant_id', tenantId)
  if (error) throw new Error(error.message)
}
