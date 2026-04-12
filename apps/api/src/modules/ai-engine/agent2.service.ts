import { getSupabaseClient } from '../../infra/supabase.js'
import { getInteractionProvider } from './llm-provider.js'
import { trackAiUsage } from './ai-engine.usage.js'
import type {
  Agent2Output,
  PatientContext,
  TenantContext,
  LLMMessage,
} from './ai-engine.types.js'

// =============================================================================
// Agent 2 — Interação com Paciente
// =============================================================================
// Roda a cada mensagem recebida (texto ou áudio transcrito).
//
// Responsabilidades:
//   1. Carregar contexto do paciente e tenant
//   2. Construir system prompt com:
//      - Mandato e limites da IA (spec seção 9)
//      - Info da clínica + especialidades
//      - Fatos do paciente (patient_facts)
//      - Histórico recente (últimas 10 msgs)
//   3. Chamar LLM e parsear resposta estruturada (JSON)
//   4. Salvar resposta como mensagem outbound
//   5. Persistir novos fatos em patient_facts (merge, não replace)
//   6. Detectar oportunidade → setar opportunity_flag + opportunity_detail
//   7. Lidar com intent: normal | escalate | optout | emergency
//   8. Atualizar last_interaction_at do paciente
// =============================================================================

// Número máximo de mensagens do histórico enviadas ao LLM
const MAX_HISTORY_MESSAGES = 10

// ---------------------------------------------------------------------------
// System prompt base (compacto — otimização de tokens)
// ---------------------------------------------------------------------------

function buildSystemPrompt(tenant: TenantContext, patient: PatientContext): string {
  const specialtiesList =
    tenant.specialties.length > 0
      ? tenant.specialties.join(', ')
      : 'não informadas'

  const factsList =
    patient.patientFacts.length > 0
      ? patient.patientFacts.map((f) => `- ${f}`).join('\n')
      : '(nenhum fato registrado ainda)'

  const summarySection = patient.interactionSummary
    ? `\nResumo anterior: ${patient.interactionSummary}`
    : ''

  const generalInfoSection = patient.generalInfo
    ? `\nInfo geral: ${patient.generalInfo}`
    : ''

  return `Você é o Assistente Virtual da ${tenant.tenantName}.
Chame sempre o paciente pelo primeiro nome: ${patient.firstName}.

ESPECIALIDADES DA CLÍNICA: ${specialtiesList}
CONTATO DA CLÍNICA: ${tenant.defaultContactPhone ?? 'não informado'}
SERVIÇOS: ${tenant.servicesDescription ?? 'não informados'}

FATOS SOBRE ESTE PACIENTE:
${factsList}${summarySection}${generalInfoSection}

MANDATO:
- Acolher, informar geralmente, lembrar consultas/medicamentos, encaminhar para humano quando necessário.
- NUNCA: diagnosticar, prescrever, alterar tratamento, interpretar exames, prognóstico.
- Em urgência: orientar buscar atendimento imediato + número da clínica.
- Se insistir em perguntas proibidas: "Não posso responder isso, ${patient.firstName}. Fale com a secretária da ${tenant.tenantName}: ${tenant.defaultContactPhone ?? 'número da clínica'}."

FRASES PROIBIDAS: "Isso é normal", "Não é nada", "Pode tomar X", "Pode ficar tranquilo", "Seu exame está bom", "Não precisa ir ao médico."

DIRECIONAMENTO:
- Especialidade que a clínica ATENDE → "Temos especialista na ${tenant.tenantName}. Fale com a secretária: ${tenant.defaultContactPhone ?? 'número da clínica'}"
- Especialidade que a clínica NÃO ATENDE → orientar especialidade genérica (não direcionar para a clínica)

RESPONDA APENAS COM JSON válido nesta estrutura exata:
{
  "reply": "mensagem para o paciente (WhatsApp, tom acolhedor, máx 500 chars)",
  "new_facts": ["fato novo 1", "fato novo 2"],
  "opportunity_detected": false,
  "opportunity_detail": null,
  "intent": "normal",
  "escalation_reason": null
}

CAMPOS:
- reply: resposta em português BR, informal mas profissional, máx 500 chars
- new_facts: array de fatos NOVOS sobre o paciente detectados NESTA conversa (ex: "tem medo de agulha", "prefere manhã", "mora longe", "está grávida"). Só inclua fatos duradouros e relevantes para futuras interações. Array vazio [] se nada novo.
- opportunity_detected: true se o paciente demonstrou interesse em serviço/procedimento que a clínica provavelmente atende
- opportunity_detail: descrição curta da oportunidade (ex: "Interesse em consulta de retorno") ou null
- intent: "normal" | "escalate" | "optout" | "emergency"
  - escalate: reclamação grave, jurídico, situação que precisa de humano
  - optout: paciente quer parar de receber mensagens
  - emergency: sinais de urgência médica
- escalation_reason: motivo se intent=escalate, null caso contrário`
}

// ---------------------------------------------------------------------------
// Carregar contexto do paciente
// ---------------------------------------------------------------------------

async function loadPatientContext(
  tenantId: string,
  patientId: string,
): Promise<PatientContext> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('patients')
    .select('id, tenant_id, name, first_name, patient_facts, general_info, interaction_summary')
    .eq('id', patientId)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !data) throw new Error(`Paciente não encontrado: ${patientId}`)

  return {
    patientId: data.id as string,
    tenantId: data.tenant_id as string,
    name: data.name as string,
    firstName: (data.first_name as string) || (data.name as string).split(' ')[0]!,
    patientFacts: Array.isArray(data.patient_facts) ? (data.patient_facts as string[]) : [],
    generalInfo: data.general_info as string | null,
    interactionSummary: data.interaction_summary as string | null,
  }
}

// ---------------------------------------------------------------------------
// Carregar contexto do tenant
// ---------------------------------------------------------------------------

async function loadTenantContext(tenantId: string): Promise<TenantContext> {
  const supabase = getSupabaseClient()

  const [{ data: tenant }, { data: specialties }, { data: contacts }] = await Promise.all([
    supabase
      .from('tenants')
      .select('id, name, services_description')
      .eq('id', tenantId)
      .single(),
    supabase
      .from('tenant_specialties')
      .select('name, type')
      .eq('tenant_id', tenantId)
      .eq('active', true),
    supabase
      .from('tenant_contacts')
      .select('whatsapp_number, phone_number')
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .eq('is_default', true)
      .limit(1),
  ])

  if (!tenant) throw new Error(`Tenant não encontrado: ${tenantId}`)

  const defaultContact = contacts?.[0]
  const defaultPhone =
    defaultContact?.whatsapp_number ?? defaultContact?.phone_number ?? null

  return {
    tenantId: tenant.id as string,
    tenantName: tenant.name as string,
    servicesDescription: tenant.services_description as string | null,
    defaultContactPhone: defaultPhone,
    specialties: specialties?.map((s) => (s as { name: string }).name) ?? [],
  }
}

// ---------------------------------------------------------------------------
// Histórico de mensagens recentes
// ---------------------------------------------------------------------------

async function loadRecentHistory(
  tenantId: string,
  conversationId: string,
): Promise<LLMMessage[]> {
  const supabase = getSupabaseClient()
  const { data } = await supabase
    .from('messages')
    .select('direction, content, message_type, audio_transcription')
    .eq('conversation_id', conversationId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(MAX_HISTORY_MESSAGES)

  if (!data || data.length === 0) return []

  // Ordenar cronologicamente (mais antigo primeiro para o LLM)
  const msgs = [...data].reverse()

  return msgs.map((m) => {
    const content =
      m.message_type === 'audio' && m.audio_transcription
        ? `[Áudio transcrito] ${m.audio_transcription}`
        : (m.content as string) || ''

    return {
      role: m.direction === 'inbound' ? 'user' : 'assistant',
      content,
    } as LLMMessage
  })
}

// ---------------------------------------------------------------------------
// Parsear output do LLM
// ---------------------------------------------------------------------------

export function parseAgent2Output(raw: string): Agent2Output {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```$/m, '')
    .trim()

  const parsed = JSON.parse(cleaned) as Partial<Agent2Output>

  const intent = (['normal', 'escalate', 'optout', 'emergency'] as const).includes(
    parsed.intent as Agent2Output['intent'],
  )
    ? (parsed.intent as Agent2Output['intent'])
    : 'normal'

  // --- LLM Trust Boundary: sanitizar campos antes de persistir/enviar ---

  // reply: truncar em 4096 chars (limite WhatsApp) e remover \0
  const rawReply = (parsed.reply ?? 'Olá! Estou aqui para ajudar. Como posso te auxiliar?')
    .replace(/\0/g, '')
    .slice(0, 4096)

  // new_facts: garantir array de strings não vazias com até 200 chars cada
  const rawFacts = Array.isArray(parsed.new_facts) ? parsed.new_facts : []
  const sanitizedFacts = rawFacts
    .filter((f): f is string => typeof f === 'string' && f.trim().length > 0)
    .map((f) => f.trim().replace(/\0/g, '').slice(0, 200))
    .slice(0, 20) // máximo 20 fatos por turno

  // opportunity_detail: string ou null, truncada em 500 chars
  const rawDetail = parsed.opportunity_detail
  const sanitizedDetail =
    typeof rawDetail === 'string' && rawDetail.trim().length > 0
      ? rawDetail.trim().replace(/\0/g, '').slice(0, 500)
      : null

  // escalation_reason: string ou null, truncada em 500 chars
  const rawEscalation = parsed.escalation_reason
  const sanitizedEscalation =
    typeof rawEscalation === 'string' && rawEscalation.trim().length > 0
      ? rawEscalation.trim().replace(/\0/g, '').slice(0, 500)
      : null

  return {
    reply: rawReply,
    new_facts: sanitizedFacts,
    opportunity_detected: parsed.opportunity_detected === true,
    opportunity_detail: sanitizedDetail,
    intent,
    escalation_reason: sanitizedEscalation,
  }
}

// ---------------------------------------------------------------------------
// Persistir novos fatos (merge sem duplicatas)
// ---------------------------------------------------------------------------

async function mergePatientFacts(
  tenantId: string,
  patientId: string,
  existingFacts: string[],
  newFacts: string[],
): Promise<void> {
  if (newFacts.length === 0) return

  const supabase = getSupabaseClient()

  // Deduplica: ignora fatos que já estão (comparação case-insensitive)
  const existingNormalized = new Set(existingFacts.map((f) => f.toLowerCase().trim()))
  const toAdd = newFacts
    .map((f) => f.trim())
    .filter((f) => f.length > 0 && !existingNormalized.has(f.toLowerCase()))

  if (toAdd.length === 0) return

  const merged = [...existingFacts, ...toAdd].slice(0, 50) // Limite de 50 fatos por paciente

  await supabase
    .from('patients')
    .update({ patient_facts: merged })
    .eq('id', patientId)
    .eq('tenant_id', tenantId)
}

// ---------------------------------------------------------------------------
// Função principal
// ---------------------------------------------------------------------------

export interface RunAgent2Input {
  tenantId: string
  patientId: string
  conversationId: string
  /** Texto da mensagem (ou transcrição de áudio) */
  messageText: string
  /** ID da mensagem inbound para salvar patient_id */
  inboundMessageId?: string
}

export interface RunAgent2Result {
  output: Agent2Output
  /** Texto da resposta enviada para o paciente */
  reply: string
}

export async function runAgent2(input: RunAgent2Input): Promise<RunAgent2Result> {
  const { tenantId, patientId, conversationId, messageText } = input

  // 1. Carregar contextos em paralelo
  const [patientCtx, tenantCtx, history] = await Promise.all([
    loadPatientContext(tenantId, patientId),
    loadTenantContext(tenantId),
    loadRecentHistory(tenantId, conversationId),
  ])

  // 2. Construir mensagens para o LLM
  const systemPrompt = buildSystemPrompt(tenantCtx, patientCtx)

  const messages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: messageText },
  ]

  // 3. Chamar LLM
  const provider = getInteractionProvider()
  const result = await provider.complete({
    messages,
    temperature: 0.4,
    maxTokens: 768,
    jsonMode: true,
  })

  // 4. Rastrear uso
  await trackAiUsage(tenantId, {
    ai_tokens_input: result.inputTokens,
    ai_tokens_output: result.outputTokens,
  })

  // 5. Parsear output
  let output: Agent2Output
  try {
    output = parseAgent2Output(result.content)
  } catch (err) {
    console.error('[Agent2] Erro ao parsear output:', result.content, err)
    output = {
      reply: `Olá, ${patientCtx.firstName}! Tudo bem? Posso te ajudar com algo?`,
      new_facts: [],
      opportunity_detected: false,
      opportunity_detail: null,
      intent: 'normal',
      escalation_reason: null,
    }
  }

  const supabase = getSupabaseClient()
  const now = new Date().toISOString()

  // 6. Persistir novos fatos do paciente
  await mergePatientFacts(tenantId, patientId, patientCtx.patientFacts, output.new_facts)

  // 7. Atualizar oportunidade se detectada
  if (output.opportunity_detected && output.opportunity_detail) {
    await supabase
      .from('patients')
      .update({
        opportunity_flag: true,
        opportunity_detail: output.opportunity_detail,
      })
      .eq('id', patientId)
      .eq('tenant_id', tenantId)
  }

  // 8. Atualizar last_interaction_at
  await supabase
    .from('patients')
    .update({ last_interaction_at: now })
    .eq('id', patientId)
    .eq('tenant_id', tenantId)

  // 9. Lidar com intent especiais
  if (output.intent === 'optout') {
    await supabase
      .from('patients')
      .update({ opt_out: true, enabled: false })
      .eq('id', patientId)
      .eq('tenant_id', tenantId)
  }

  if (output.intent === 'escalate') {
    await supabase
      .from('conversations')
      .update({
        status: 'escalated',
        escalation_reason: output.escalation_reason ?? 'Escalonamento automático pelo AI',
        updated_at: now,
      })
      .eq('id', conversationId)
      .eq('tenant_id', tenantId)
  }

  // 10. Salvar mensagem outbound no banco
  await supabase.from('messages').insert({
    tenant_id: tenantId,
    conversation_id: conversationId,
    patient_id: patientId,
    direction: 'outbound',
    content: output.reply,
    message_type: 'text',
    ai_intent_detected: {
      intent: output.intent,
      opportunity_detected: output.opportunity_detected,
      new_facts_count: output.new_facts.length,
      escalation_reason: output.escalation_reason ?? null,
    },
    created_at: now,
  })

  // 11. Atualizar last_message_at da conversa
  await supabase
    .from('conversations')
    .update({ last_message_at: now })
    .eq('id', conversationId)
    .eq('tenant_id', tenantId)
    .neq('status', 'escalated') // Não sobrescreve se escalada

  return { output, reply: output.reply }
}
