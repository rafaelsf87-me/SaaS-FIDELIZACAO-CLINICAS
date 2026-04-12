export type ConversationStatus = 'active' | 'closed' | 'escalated'
export type MessageDirection = 'inbound' | 'outbound'
export type MessageType = 'text' | 'template' | 'media' | 'audio'
export type MessageWaStatus = 'sent' | 'delivered' | 'read' | 'failed'

export interface Conversation {
  id: string
  patient_id: string
  tenant_id: string
  whatsapp_conversation_id: string | null
  status: ConversationStatus
  escalation_reason: string | null
  escalated_to: string | null
  last_message_at: string | null
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  tenant_id: string
  patient_id: string
  direction: MessageDirection
  content: string | null
  template_id: string | null
  message_type: MessageType
  media_url: string | null
  audio_transcription: string | null
  wa_message_id: string | null
  wa_status: MessageWaStatus | null
  ai_intent_detected: AiIntentDetected | null
  created_at: string
}

export interface AiIntentDetected {
  intent: 'educativo' | 'commercial' | 'clinical' | 'escalation'
  escalate: boolean
  escalation_reason: string | null
  detected_specialty: string | null
}
