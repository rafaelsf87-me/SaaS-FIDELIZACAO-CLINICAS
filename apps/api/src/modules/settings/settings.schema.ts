import { z } from 'zod'

// -----------------------------------------------------------------------
// Clinic data (próprio tenant)
// -----------------------------------------------------------------------

export const UpdateClinicSettingsSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().nullable().optional(),
  services_description: z.string().nullable().optional(),
  phone_contact: z.string().nullable().optional(),
  waba_phone_number_id: z.string().nullable().optional(),
  waba_access_token: z.string().nullable().optional(),
  followup_inactivity_enabled: z.boolean().optional(),
  followup_contextual_enabled: z.boolean().optional(),
})

// -----------------------------------------------------------------------
// Contacts
// -----------------------------------------------------------------------

export const CreateContactSchema = z.object({
  label: z.string().min(1, 'Label obrigatório'),
  phone_number: z.string().nullable().optional(),
  whatsapp_number: z.string().nullable().optional(),
  scope_description: z.string().nullable().optional(),
  is_default: z.boolean().optional(),
})

export const UpdateContactSchema = CreateContactSchema.partial()

export const ContactIdParamSchema = z.object({
  contactId: z.string().uuid('ID inválido'),
})

// -----------------------------------------------------------------------
// Specialties
// -----------------------------------------------------------------------

export const CreateSpecialtySchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  type: z.enum(['specialty', 'procedure', 'service']),
  contact_id: z.string().uuid().nullable().optional(),
})

export const UpdateSpecialtySchema = CreateSpecialtySchema.partial()

export const SpecialtyIdParamSchema = z.object({
  specId: z.string().uuid('ID inválido'),
})

export type UpdateClinicSettingsInput = z.infer<typeof UpdateClinicSettingsSchema>
export type CreateContactInput = z.infer<typeof CreateContactSchema>
export type UpdateContactInput = z.infer<typeof UpdateContactSchema>
export type CreateSpecialtyInput = z.infer<typeof CreateSpecialtySchema>
export type UpdateSpecialtyInput = z.infer<typeof UpdateSpecialtySchema>
