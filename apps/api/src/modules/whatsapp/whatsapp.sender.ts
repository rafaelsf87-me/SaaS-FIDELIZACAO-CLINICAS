import { getSupabaseClient } from '../../infra/supabase.js'
import type {
  MetaSendResponse,
  SendTextPayload,
  SendTemplatePayload,
  SendContactPayload,
  TemplateComponent,
  TenantWhatsAppCreds,
  WhatsAppVCard,
} from './whatsapp.types.js'

const META_API_BASE = 'https://graph.facebook.com/v21.0'
const MOCK = process.env.WHATSAPP_MOCK === 'true'

// -----------------------------------------------------------------------
// Tenant credentials
// -----------------------------------------------------------------------

/**
 * Busca credenciais WhatsApp do tenant.
 * Fallback para variáveis de ambiente se o tenant não tiver configuração própria.
 */
export async function getTenantCreds(tenantId: string): Promise<TenantWhatsAppCreds> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('tenants')
    .select('waba_phone_number_id, waba_access_token')
    .eq('id', tenantId)
    .single()

  if (error) throw new Error(`Tenant não encontrado: ${tenantId}`)

  const phoneNumberId = data.waba_phone_number_id ?? process.env.META_PHONE_NUMBER_ID
  const accessToken = data.waba_access_token ?? process.env.META_WHATSAPP_TOKEN

  if (!phoneNumberId || !accessToken) {
    throw new Error('Credenciais WhatsApp não configuradas para este tenant')
  }

  return { tenantId, phoneNumberId, accessToken }
}

// -----------------------------------------------------------------------
// Core send function
// -----------------------------------------------------------------------

async function callMetaAPI(
  phoneNumberId: string,
  accessToken: string,
  payload: SendTextPayload | SendTemplatePayload | SendContactPayload,
): Promise<MetaSendResponse> {
  if (MOCK) {
    const mockId = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    console.log('[WhatsApp MOCK] send:', JSON.stringify(payload, null, 2))
    return {
      messaging_product: 'whatsapp',
      contacts: [{ input: payload.to, wa_id: payload.to }],
      messages: [{ id: mockId }],
    }
  }

  const url = `${META_API_BASE}/${phoneNumberId}/messages`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Meta API error ${res.status}: ${body}`)
  }

  return res.json() as Promise<MetaSendResponse>
}

// -----------------------------------------------------------------------
// Public send functions
// -----------------------------------------------------------------------

/**
 * Envia mensagem de texto simples.
 */
export async function sendTextMessage(
  tenantId: string,
  toPhone: string,
  text: string,
): Promise<MetaSendResponse> {
  const creds = await getTenantCreds(tenantId)
  const payload: SendTextPayload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: toPhone,
    type: 'text',
    text: { body: text },
  }
  return callMetaAPI(creds.phoneNumberId, creds.accessToken, payload)
}

/**
 * Envia mensagem usando template aprovado pela Meta.
 */
export async function sendTemplateMessage(
  tenantId: string,
  toPhone: string,
  templateName: string,
  languageCode: string,
  components?: TemplateComponent[],
): Promise<MetaSendResponse> {
  const creds = await getTenantCreds(tenantId)
  const payload: SendTemplatePayload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: toPhone,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(components && components.length > 0 ? { components } : {}),
    },
  }
  return callMetaAPI(creds.phoneNumberId, creds.accessToken, payload)
}

/**
 * Envia contato como vCard interativo (contacts message).
 * Usado no fluxo de escalada: o paciente recebe um card clicável que abre
 * diretamente o WhatsApp da secretária — sem precisar salvar o número manualmente.
 */
export async function sendContactMessage(
  tenantId: string,
  toPhone: string,
  contacts: WhatsAppVCard[],
): Promise<MetaSendResponse> {
  const creds = await getTenantCreds(tenantId)
  const payload: SendContactPayload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: toPhone,
    type: 'contacts',
    contacts,
  }
  return callMetaAPI(creds.phoneNumberId, creds.accessToken, payload)
}

/**
 * Envia o contato da secretária como vCard para o paciente.
 * Busca o contato de escalada configurado no tenant (tipo 'secretary').
 * Fallback: envia o número principal da clínica.
 */
export async function sendEscalationContact(
  tenantId: string,
  patientPhone: string,
): Promise<MetaSendResponse> {
  const supabase = getSupabaseClient()

  // Busca o contato de escalada configurado (type='secretary' ou primeiro disponível)
  const { data: contacts } = await supabase
    .from('tenant_contacts')
    .select('name, whatsapp_number, role')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })
    .limit(5)

  // Busca nome da clínica para o org
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name')
    .eq('id', tenantId)
    .single()

  // Prioriza contato com whatsapp_number preenchido
  const escalationContact = contacts?.find((c) => c.whatsapp_number) ?? null

  if (!escalationContact?.whatsapp_number) {
    throw new Error('Nenhum contato de escalada com WhatsApp configurado para este tenant')
  }

  const phone = escalationContact.whatsapp_number.replace(/\D/g, '')
  const vCard: WhatsAppVCard = {
    name: { formatted_name: escalationContact.name },
    phones: [{ phone, type: 'WORK', wa_id: phone }],
    ...(tenant?.name ? { org: { company: tenant.name } } : {}),
  }

  return sendContactMessage(tenantId, patientPhone, [vCard])
}
