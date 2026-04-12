import { z } from 'zod'

export const PatientStatusSchema = z.enum(['review', 'active', 'inactive'])
export const PatientSexSchema = z.enum(['M', 'F'])

// -----------------------------------------------------------------------
// Query
// -----------------------------------------------------------------------

export const ListPatientsQuerySchema = z.object({
  search: z.string().max(100).optional(),
  status: PatientStatusSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

// -----------------------------------------------------------------------
// Patient CRUD
// -----------------------------------------------------------------------

export const CreatePatientSchema = z.object({
  cpf: z.string().min(11, 'CPF deve ter ao menos 11 dígitos').max(14),
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  phone_whatsapp: z.string().min(10, 'Telefone inválido'),
  birth_date: z.string().date('Data de nascimento inválida').nullable().optional(),
  sex: PatientSexSchema.nullable().optional(),
  health_plan: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  general_info: z.string().nullable().optional(),
  recurrence_flag: z.boolean().optional(),
})

export const UpdatePatientSchema = CreatePatientSchema.partial().extend({
  status: PatientStatusSchema.optional(),
  enabled: z.boolean().optional(),
  opt_out: z.boolean().optional(),
  opportunity_flag: z.boolean().optional(),
  opportunity_detail: z.string().nullable().optional(),
})

export const ResolveOpportunitySchema = z.object({
  _resolve: z.literal(true).optional(),   // payload vazio é válido — schema serve como marcador
})

export const UpdatePatientStatusSchema = z.object({
  status: PatientStatusSchema,
})

export const PatientIdParamSchema = z.object({
  id: z.string().uuid('ID de paciente inválido'),
})

// -----------------------------------------------------------------------
// Endpoint externo — status sempre 'review', nunca exposto ao caller
// recurrence_flag é omitido: integrações externas não definem recorrência
// -----------------------------------------------------------------------

export const ExternalCreatePatientSchema = CreatePatientSchema.omit({ recurrence_flag: true })

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

export type ListPatientsQuery = z.infer<typeof ListPatientsQuerySchema>
export type CreatePatientInput = z.infer<typeof CreatePatientSchema>
export type UpdatePatientInput = z.infer<typeof UpdatePatientSchema>
export type UpdatePatientStatusInput = z.infer<typeof UpdatePatientStatusSchema>
export type ExternalCreatePatientInput = z.infer<typeof ExternalCreatePatientSchema>
