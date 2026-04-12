export type EscalationCategory = 'emergency' | 'clinical' | 'commercial' | 'optout' | 'operational'
export type EscalationMode = 'immediate' | 'conversational'

export interface EscalationKeyword {
  id: string
  tenant_id: string | null
  keyword: string
  category: EscalationCategory
  mode: EscalationMode
  priority: number
  is_default: boolean
  active: boolean
  created_at: string
}
