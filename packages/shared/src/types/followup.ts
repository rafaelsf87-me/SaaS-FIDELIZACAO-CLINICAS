export type FollowupSource = 'inactivity' | 'contextual'
export type FollowupTriggerType = 'medication' | 'exam' | 'return' | 'custom'
export type FollowupStatus = 'pending' | 'sent' | 'cancelled' | 'responded'

export interface PatientFollowupAgenda {
  id: string
  patient_id: string
  tenant_id: string
  source: FollowupSource
  scenario_id: string | null
  trigger_type: FollowupTriggerType | null
  trigger_detail: Record<string, unknown> | null
  scheduled_date: string
  sent_at: string | null
  status: FollowupStatus
  template_id: string | null
  created_at: string
}

export interface FollowupScenario {
  id: string
  tenant_id: string | null
  name: string
  trigger_type: FollowupTriggerType
  interval_days: number
  repeat_every_days: number | null
  max_repeats: number
  message_template: string | null
  active: boolean
  is_default: boolean
  created_at: string
  updated_at: string
}
