export type TenantStatus = 'active' | 'inactive'

export interface Tenant {
  id: string
  name: string
  logo_url: string | null
  description: string | null
  services_description: string | null
  phone_contact: string | null
  waba_phone_number_id: string | null
  waba_access_token: string | null
  followup_inactivity_enabled: boolean
  followup_contextual_enabled: boolean
  followup_config: Record<string, unknown>
  status: TenantStatus
  created_at: string
  updated_at: string
}

export interface TenantContact {
  id: string
  tenant_id: string
  label: string
  phone_number: string | null
  whatsapp_number: string | null
  scope_description: string | null
  is_default: boolean
  active: boolean
  created_at: string
}

export type SpecialtyType = 'specialty' | 'procedure' | 'service'

export interface TenantSpecialty {
  id: string
  tenant_id: string
  name: string
  type: SpecialtyType
  contact_id: string | null
  active: boolean
  created_at: string
}
