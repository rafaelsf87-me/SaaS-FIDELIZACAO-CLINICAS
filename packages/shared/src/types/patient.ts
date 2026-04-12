// Fonte da verdade: @crm/database (fonte canônica gerada pelo schema Supabase)
import type { PatientSex, PatientStatus } from '@crm/database'
export type { PatientSex, PatientStatus }

export interface Patient {
  id: string
  tenant_id: string
  cpf: string
  name: string
  first_name: string
  birth_date: string | null
  sex: PatientSex | null
  health_plan: string | null
  address: string | null
  phone_whatsapp: string
  general_info: string | null
  status: PatientStatus
  recurrence_flag: boolean
  enabled: boolean
  opt_out: boolean
  interaction_summary: string | null
  last_interaction_at: string | null
  created_at: string
  updated_at: string
}

export interface PatientDocument {
  id: string
  patient_id: string
  tenant_id: string
  file_url: string
  file_name: string
  file_type: string | null
  extracted_data: ExtractedDocumentData | null
  is_active: boolean
  uploaded_at: string
}

export interface ExtractedDocumentData {
  medications: Array<{
    name: string
    dosage: string
    frequency: string
    duration_days: number | null
    start_date: string | null
  }>
  exams: Array<{
    name: string
    requested_date: string | null
    notes: string | null
  }>
  returns: Array<{
    date: string | null
    interval_days: number | null
    notes: string | null
  }>
  orientations: Array<{
    description: string
    category: string
  }>
  summary: string
}
