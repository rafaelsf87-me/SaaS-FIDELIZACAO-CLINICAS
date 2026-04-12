import { getSupabaseClient } from '../../infra/supabase.js'
import { getTenantCreds } from './whatsapp.sender.js'

const META_API_BASE = 'https://graph.facebook.com/v21.0'
const MOCK = process.env.WHATSAPP_MOCK === 'true'

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

export type TemplateStatus = 'pending' | 'approved' | 'rejected' | 'paused'
export type TemplateCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'

export interface TemplateSubmitInput {
  name: string
  category: TemplateCategory
  language: string
  /** Corpo do template — use {{1}} para variáveis */
  bodyText: string
  headerText?: string
  footerText?: string
}

export interface TemplateRecord {
  id: string
  tenant_id: string | null
  name: string
  meta_template_id: string | null
  status: TemplateStatus
  language: string
  category: string
  body_text: string
  header_text: string | null
  footer_text: string | null
  created_at: string
  updated_at: string
}

// -----------------------------------------------------------------------
// List templates for tenant
// -----------------------------------------------------------------------

export async function listTemplates(tenantId: string): Promise<TemplateRecord[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('whatsapp_templates')
    .select('*')
    .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as TemplateRecord[]
}

// -----------------------------------------------------------------------
// Submit template to Meta for approval (placeholder)
// -----------------------------------------------------------------------

/**
 * Envia template para aprovação da Meta.
 * Salva localmente com status 'pending' e armazena meta_template_id quando aprovado.
 *
 * TODO(Etapa 9): Implementar webhook de status de template da Meta
 * para atualizar automaticamente de 'pending' → 'approved'/'rejected'.
 */
export async function submitTemplate(
  tenantId: string,
  input: TemplateSubmitInput,
): Promise<TemplateRecord> {
  const supabase = getSupabaseClient()

  if (MOCK) {
    const mockMetaId = `mock_tpl_${Date.now()}`
    const { data, error } = await supabase
      .from('whatsapp_templates')
      .insert({
        tenant_id: tenantId,
        name: input.name,
        meta_template_id: mockMetaId,
        status: 'approved', // mock: aprova imediatamente
        language: input.language,
        category: input.category,
        body_text: input.bodyText,
        header_text: input.headerText ?? null,
        footer_text: input.footerText ?? null,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data as TemplateRecord
  }

  // Submissão real via Meta API
  const creds = await getTenantCreds(tenantId)
  const wabaId = creds.phoneNumberId // waba_id pode diferir — usando phone_number_id como proxy

  const components: object[] = []
  if (input.headerText) {
    components.push({ type: 'HEADER', format: 'TEXT', text: input.headerText })
  }
  components.push({ type: 'BODY', text: input.bodyText })
  if (input.footerText) {
    components.push({ type: 'FOOTER', text: input.footerText })
  }

  const res = await fetch(`${META_API_BASE}/${wabaId}/message_templates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${creds.accessToken}`,
    },
    body: JSON.stringify({
      name: input.name,
      category: input.category,
      language: input.language,
      components,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Meta template submit error ${res.status}: ${body}`)
  }

  const metaResult = await res.json() as { id: string }

  const { data, error } = await supabase
    .from('whatsapp_templates')
    .insert({
      tenant_id: tenantId,
      name: input.name,
      meta_template_id: metaResult.id,
      status: 'pending',
      language: input.language,
      category: input.category,
      body_text: input.bodyText,
      header_text: input.headerText ?? null,
      footer_text: input.footerText ?? null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as TemplateRecord
}

// -----------------------------------------------------------------------
// Get template status
// -----------------------------------------------------------------------

export async function getTemplateStatus(
  tenantId: string,
  templateName: string,
): Promise<TemplateStatus | null> {
  const supabase = getSupabaseClient()
  const { data } = await supabase
    .from('whatsapp_templates')
    .select('status')
    .eq('name', templateName)
    .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (data?.status as TemplateStatus) ?? null
}
