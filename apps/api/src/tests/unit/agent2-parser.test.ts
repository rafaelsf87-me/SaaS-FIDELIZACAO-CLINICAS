import { describe, it, expect, vi } from 'vitest'
import { parseAgent2Output } from '../../modules/ai-engine/agent2.service.js'

// Mock das dependências de infra (não são necessárias para a função pura)
vi.mock('../../infra/supabase.js', () => ({ getSupabaseClient: vi.fn() }))
vi.mock('../../modules/ai-engine/llm-provider.js', () => ({
  getInteractionProvider: vi.fn(),
}))
vi.mock('../../modules/ai-engine/ai-engine.usage.js', () => ({
  trackAiUsage: vi.fn(),
}))

describe('parseAgent2Output — keyword matcher e validação de intent', () => {
  it('parseia output normal completo', () => {
    const raw = JSON.stringify({
      reply: 'Olá, tudo bem! Como posso ajudar?',
      new_facts: ['gosta de manhã'],
      opportunity_detected: false,
      opportunity_detail: null,
      intent: 'normal',
      escalation_reason: null,
    })

    const result = parseAgent2Output(raw)
    expect(result.reply).toBe('Olá, tudo bem! Como posso ajudar?')
    expect(result.intent).toBe('normal')
    expect(result.new_facts).toEqual(['gosta de manhã'])
    expect(result.opportunity_detected).toBe(false)
    expect(result.opportunity_detail).toBeNull()
  })

  it('detecta intent optout corretamente', () => {
    const raw = JSON.stringify({
      reply: 'Obrigado! Removemos você da lista.',
      new_facts: [],
      opportunity_detected: false,
      opportunity_detail: null,
      intent: 'optout',
      escalation_reason: null,
    })

    const result = parseAgent2Output(raw)
    expect(result.intent).toBe('optout')
  })

  it('detecta intent escalate com reason', () => {
    const raw = JSON.stringify({
      reply: 'Vou transferir para um atendente humano.',
      new_facts: [],
      opportunity_detected: false,
      opportunity_detail: null,
      intent: 'escalate',
      escalation_reason: 'Paciente solicitou cancelamento de procedimento',
    })

    const result = parseAgent2Output(raw)
    expect(result.intent).toBe('escalate')
    expect(result.escalation_reason).toBe('Paciente solicitou cancelamento de procedimento')
  })

  it('detecta intent emergency', () => {
    const raw = JSON.stringify({
      reply: 'Por favor, procure atendimento de emergência imediatamente.',
      new_facts: [],
      opportunity_detected: false,
      opportunity_detail: null,
      intent: 'emergency',
      escalation_reason: null,
    })

    const result = parseAgent2Output(raw)
    expect(result.intent).toBe('emergency')
  })

  it('normaliza intent inválido para normal', () => {
    const raw = JSON.stringify({
      reply: 'Resposta',
      new_facts: [],
      opportunity_detected: false,
      opportunity_detail: null,
      intent: 'invalid_value',
      escalation_reason: null,
    })

    const result = parseAgent2Output(raw)
    expect(result.intent).toBe('normal')
  })

  it('parseia output com markdown code block', () => {
    const raw = '```json\n{"reply":"Olá!","new_facts":[],"opportunity_detected":false,"opportunity_detail":null,"intent":"normal","escalation_reason":null}\n```'
    const result = parseAgent2Output(raw)
    expect(result.reply).toBe('Olá!')
    expect(result.intent).toBe('normal')
  })

  it('trunca reply que excede 4096 chars', () => {
    const longReply = 'x'.repeat(5000)
    const raw = JSON.stringify({
      reply: longReply,
      new_facts: [],
      opportunity_detected: false,
      opportunity_detail: null,
      intent: 'normal',
      escalation_reason: null,
    })

    const result = parseAgent2Output(raw)
    expect(result.reply.length).toBeLessThanOrEqual(4096)
  })

  it('limita new_facts a máximo de 20 itens', () => {
    const manyFacts = Array.from({ length: 30 }, (_, i) => `fato ${i}`)
    const raw = JSON.stringify({
      reply: 'Olá',
      new_facts: manyFacts,
      opportunity_detected: false,
      opportunity_detail: null,
      intent: 'normal',
      escalation_reason: null,
    })

    const result = parseAgent2Output(raw)
    expect(result.new_facts.length).toBeLessThanOrEqual(20)
  })

  it('filtra new_facts que não são strings', () => {
    const raw = JSON.stringify({
      reply: 'Olá',
      new_facts: ['válido', 123, null, 'também válido'],
      opportunity_detected: false,
      opportunity_detail: null,
      intent: 'normal',
      escalation_reason: null,
    })

    const result = parseAgent2Output(raw)
    expect(result.new_facts).toEqual(['válido', 'também válido'])
  })

  it('detecta oportunidade quando opportunity_detected=true', () => {
    const raw = JSON.stringify({
      reply: 'Temos ótimas opções para você!',
      new_facts: [],
      opportunity_detected: true,
      opportunity_detail: 'Interesse em consulta de retorno ortopédico',
      intent: 'normal',
      escalation_reason: null,
    })

    const result = parseAgent2Output(raw)
    expect(result.opportunity_detected).toBe(true)
    expect(result.opportunity_detail).toBe('Interesse em consulta de retorno ortopédico')
  })

  it('usa fallback de reply quando reply está ausente', () => {
    const raw = JSON.stringify({
      new_facts: [],
      opportunity_detected: false,
      opportunity_detail: null,
      intent: 'normal',
      escalation_reason: null,
    })

    const result = parseAgent2Output(raw)
    expect(result.reply).toBeTruthy()
    expect(result.reply.length).toBeGreaterThan(0)
  })

  it('lança erro para JSON inválido', () => {
    expect(() => parseAgent2Output('not json at all')).toThrow()
  })
})
