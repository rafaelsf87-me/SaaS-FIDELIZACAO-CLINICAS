// -----------------------------------------------------------------------
// Meta Cloud API — Webhook payload types
// -----------------------------------------------------------------------

export interface MetaWebhookPayload {
  object: string
  entry: MetaEntry[]
}

export interface MetaEntry {
  id: string
  changes: MetaChange[]
}

export interface MetaChange {
  value: MetaChangeValue
  field: string
}

export interface MetaChangeValue {
  messaging_product: string
  metadata: MetaMetadata
  contacts?: MetaContact[]
  messages?: MetaMessage[]
  statuses?: MetaStatus[]
}

export interface MetaMetadata {
  display_phone_number: string
  phone_number_id: string
}

export interface MetaContact {
  profile: { name: string }
  wa_id: string
}

export type MetaMessageType =
  | 'text'
  | 'audio'
  | 'image'
  | 'document'
  | 'video'
  | 'contacts'
  | 'location'
  | 'sticker'
  | 'reaction'
  | 'unsupported'
  | 'unknown'

export interface MetaMessage {
  from: string
  id: string
  timestamp: string
  type: MetaMessageType
  text?: { body: string }
  audio?: { id: string; mime_type: string }
  image?: { id: string; mime_type: string; caption?: string }
  document?: { id: string; filename: string; mime_type: string; caption?: string }
  video?: { id: string; mime_type: string; caption?: string }
  contacts?: MetaContactMessage[]
  location?: { latitude: number; longitude: number; name?: string; address?: string }
  reaction?: { message_id: string; emoji: string }
}

export interface MetaContactMessage {
  name: { formatted_name: string; first_name?: string; last_name?: string }
  phones?: { phone: string; type: string; wa_id?: string }[]
  emails?: { email: string; type: string }[]
  org?: { company: string }
}

export interface MetaStatus {
  id: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  timestamp: string
  recipient_id: string
  conversation?: { id: string; origin: { type: string } }
  pricing?: { billable: boolean; pricing_model: string; category: string }
  errors?: { code: number; title: string; message: string; error_data?: { details: string } }[]
}

// -----------------------------------------------------------------------
// Meta Cloud API — Send message payload types
// -----------------------------------------------------------------------

export interface MetaSendResponse {
  messaging_product: 'whatsapp'
  contacts: { input: string; wa_id: string }[]
  messages: { id: string }[]
}

export interface SendTextPayload {
  messaging_product: 'whatsapp'
  recipient_type: 'individual'
  to: string
  type: 'text'
  text: { body: string; preview_url?: boolean }
}

export interface SendTemplatePayload {
  messaging_product: 'whatsapp'
  recipient_type: 'individual'
  to: string
  type: 'template'
  template: {
    name: string
    language: { code: string }
    components?: TemplateComponent[]
  }
}

export interface TemplateComponent {
  type: 'header' | 'body' | 'button'
  sub_type?: 'quick_reply' | 'url'
  index?: string
  parameters: TemplateParameter[]
}

export interface TemplateParameter {
  type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video'
  text?: string
  currency?: { fallback_value: string; code: string; amount_1000: number }
}

export interface SendContactPayload {
  messaging_product: 'whatsapp'
  recipient_type: 'individual'
  to: string
  type: 'contacts'
  contacts: WhatsAppVCard[]
}

export interface WhatsAppVCard {
  name: {
    formatted_name: string
    first_name?: string
    last_name?: string
  }
  phones: {
    phone: string
    type: 'WORK' | 'CELL' | 'MAIN' | 'HOME'
    wa_id?: string
  }[]
  org?: { company: string }
}

// -----------------------------------------------------------------------
// Internal types
// -----------------------------------------------------------------------

export interface TenantWhatsAppCreds {
  tenantId: string
  phoneNumberId: string
  accessToken: string
}
