import { z } from 'zod'

// -----------------------------------------------------------------------
// Tenant
// -----------------------------------------------------------------------

export const CreateTenantSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  description: z.string().optional(),
  services_description: z.string().optional(),
  phone_contact: z.string().optional(),
  // Usuário admin inicial obrigatório ao criar tenant
  admin_email: z.string().email('Email inválido'),
  admin_name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  admin_password: z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
})

export const UpdateTenantSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().nullable().optional(),
  services_description: z.string().nullable().optional(),
  phone_contact: z.string().nullable().optional(),
  waba_phone_number_id: z.string().nullable().optional(),
  waba_access_token: z.string().nullable().optional(),
  followup_inactivity_enabled: z.boolean().optional(),
  followup_contextual_enabled: z.boolean().optional(),
  followup_config: z.record(z.unknown()).optional(),
  status: z.enum(['active', 'inactive']).optional(),
})

export const TenantIdParamSchema = z.object({
  id: z.string().uuid('ID inválido'),
})

// -----------------------------------------------------------------------
// Contact
// -----------------------------------------------------------------------

export const CreateContactSchema = z.object({
  label: z.string().min(1, 'Label obrigatório'),
  phone_number: z.string().nullable().optional(),
  whatsapp_number: z.string().nullable().optional(),
  scope_description: z.string().nullable().optional(),
  is_default: z.boolean().optional(),
})

export const UpdateContactSchema = CreateContactSchema.partial()

export const ContactParamSchema = z.object({
  id: z.string().uuid(),
  contactId: z.string().uuid(),
})

// -----------------------------------------------------------------------
// Specialty
// -----------------------------------------------------------------------

export const CreateSpecialtySchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  type: z.enum(['specialty', 'procedure', 'service']),
  contact_id: z.string().uuid().nullable().optional(),
})

export const UpdateSpecialtySchema = CreateSpecialtySchema.partial()

export const SpecialtyParamSchema = z.object({
  id: z.string().uuid(),
  specId: z.string().uuid(),
})

export type CreateTenantInput = z.infer<typeof CreateTenantSchema>
export type UpdateTenantInput = z.infer<typeof UpdateTenantSchema>
export type CreateContactInput = z.infer<typeof CreateContactSchema>
export type UpdateContactInput = z.infer<typeof UpdateContactSchema>
export type CreateSpecialtyInput = z.infer<typeof CreateSpecialtySchema>
export type UpdateSpecialtyInput = z.infer<typeof UpdateSpecialtySchema>
