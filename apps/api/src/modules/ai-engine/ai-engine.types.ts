// =============================================================================
// AI Engine — Tipos compartilhados
// =============================================================================

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMCompletionOptions {
  messages: LLMMessage[]
  /** Temperatura 0‑1. Default: 0.3 (respostas consistentes para contexto clínico) */
  temperature?: number
  /** Máximo de tokens na resposta */
  maxTokens?: number
  /** JSON mode: força output JSON válido */
  jsonMode?: boolean
}

export interface LLMCompletionResult {
  content: string
  inputTokens: number
  outputTokens: number
}

// ---------------------------------------------------------------------------
// ILLMProvider — contrato único para Sonnet/OpenAI
// ---------------------------------------------------------------------------
export interface ILLMProvider {
  complete(options: LLMCompletionOptions): Promise<LLMCompletionResult>
}

// ---------------------------------------------------------------------------
// Agent 2 — output estruturado
// ---------------------------------------------------------------------------
export interface Agent2Output {
  /** Resposta para enviar ao paciente via WhatsApp */
  reply: string
  /** Fatos novos detectados nesta conversa (ex: "tem medo de agulha") */
  new_facts: string[]
  /** Detectou sinal de interesse em serviço da clínica? */
  opportunity_detected: boolean
  /** Detalhe da oportunidade (ex: "Interesse em botox") */
  opportunity_detail: string | null
  /**
   * Intent classificado:
   * - normal       → resposta padrão, sem ação especial
   * - escalate     → escalonar para humano imediatamente
   * - optout       → paciente quer sair
   * - emergency    → urgência, orientar procurar atendimento
   */
  intent: 'normal' | 'escalate' | 'optout' | 'emergency'
  /** Motivo do escalonamento (preenchido quando intent=escalate) */
  escalation_reason?: string | null
}

// ---------------------------------------------------------------------------
// Agent 1 — output estruturado
// ---------------------------------------------------------------------------
export interface Agent1Output {
  /** Lista de medicamentos com posologia e duração */
  medications: Array<{
    name: string
    dosage: string
    frequency: string
    duration_days?: number
  }>
  /** Pedidos de exame */
  exams: Array<{
    name: string
    urgency?: 'routine' | 'urgent'
    notes?: string
  }>
  /** Retorno agendado */
  return_appointments: Array<{
    specialty?: string
    date_hint?: string
    notes?: string
  }>
  /** Orientações gerais do médico */
  instructions: string[]
  /** Resumo narrativo da consulta */
  summary: string
}

// ---------------------------------------------------------------------------
// Contexto do paciente para o LLM
// ---------------------------------------------------------------------------
export interface PatientContext {
  patientId: string
  tenantId: string
  firstName: string
  name: string
  /** Fatos personalizados salvos de conversas anteriores */
  patientFacts: string[]
  generalInfo?: string | null
  interactionSummary?: string | null
}

export interface TenantContext {
  tenantId: string
  tenantName: string
  servicesDescription?: string | null
  defaultContactPhone?: string | null
  specialties: string[]
}
