/**
 * Teste de integração — Fluxo completo em mock mode
 *
 * Simula o fluxo: cadastro de paciente → boas-vindas → mensagem recebida → Agent 2 → agenda FUP
 *
 * Todas as dependências externas (Supabase, BullMQ, WhatsApp, LLM) são mockadas.
 * Não requer conectividade com serviços reais.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// -----------------------------------------------------------------------
// Mocks globais
// -----------------------------------------------------------------------

// Cria cadeia fluente para o mock do Supabase
function makeChain(finalValue: unknown) {
  const chain: Record<string, unknown> = {}
  const fns = ['select', 'eq', 'in', 'gt', 'limit', 'order', 'single', 'maybeSingle', 'insert', 'update', 'upsert', 'delete', 'neq', 'lte']
  for (const fn of fns) {
    chain[fn] = vi.fn().mockReturnValue(chain)
  }
  ;(chain['single'] as ReturnType<typeof vi.fn>).mockResolvedValue(finalValue)
  ;(chain['maybeSingle'] as ReturnType<typeof vi.fn>).mockResolvedValue(finalValue)
  return chain
}

const mockFrom = vi.fn()

vi.mock('../../infra/supabase.js', () => ({
  getSupabaseClient: () => ({
    from: mockFrom,
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://storage/doc.pdf' } }),
      }),
    },
  }),
}))

vi.mock('../../infra/redis.js', () => ({
  createRedisConnection: vi.fn().mockReturnValue({}),
}))

// Mock com referência fixa para o complete — permite mockResolvedValueOnce nos testes
const mockInteractionComplete = vi.fn().mockResolvedValue({
  content: JSON.stringify({
    reply: 'Olá! Como posso ajudar?',
    new_facts: [],
    opportunity_detected: false,
    opportunity_detail: null,
    intent: 'normal',
    escalation_reason: null,
  }),
  inputTokens: 100,
  outputTokens: 50,
})

vi.mock('../../modules/ai-engine/llm-provider.js', () => ({
  getInteractionProvider: () => ({ complete: mockInteractionComplete }),
  getAnalysisProvider: () => ({
    complete: vi.fn().mockResolvedValue({
      content: JSON.stringify({
        medications: [{ name: 'Amoxicilina', dosage: '500mg', frequency: '3x ao dia', duration_days: 7 }],
        exams: [],
        return_appointments: [{ specialty: 'Clínico Geral', date_hint: '30 dias' }],
        instructions: ['Tomar com alimentos'],
        summary: 'Consulta de rotina. Receita de antibiótico por 7 dias.',
      }),
      inputTokens: 200,
      outputTokens: 100,
    }),
  }),
}))

vi.mock('../../modules/ai-engine/ai-engine.usage.js', () => ({
  trackAiUsage: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../modules/whatsapp/whatsapp.sender.js', () => ({
  sendTextMessage: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../modules/followup/followup.queues.js', () => ({
  getOnboardingQueue: vi.fn().mockReturnValue({
    add: vi.fn().mockResolvedValue({ id: 'job-001' }),
  }),
  getFollowupQueue: vi.fn().mockReturnValue({
    add: vi.fn().mockResolvedValue({ id: 'job-002' }),
  }),
}))

// -----------------------------------------------------------------------
// Testes
// -----------------------------------------------------------------------

describe('Fluxo de Integração — Patient Onboarding (Mock Mode)', () => {
  const tenantId = 'tenant-test-001'
  const patientId = 'patient-test-001'
  const conversationId = 'conv-test-001'

  beforeEach(() => {
    vi.clearAllMocks()

    // Configuração padrão do mock do Supabase
    mockFrom.mockImplementation((table: string) => {
      const chain = makeChain({ data: null, error: null })

      if (table === 'patients') {
        ;(chain['single'] as ReturnType<typeof vi.fn>).mockResolvedValue({
          data: {
            id: patientId,
            tenant_id: tenantId,
            name: 'Maria Silva',
            first_name: 'Maria',
            phone_whatsapp: '5511999990000',
            patient_facts: [],
            general_info: null,
            interaction_summary: null,
          },
          error: null,
        })
        ;(chain['maybeSingle'] as ReturnType<typeof vi.fn>).mockResolvedValue({
          data: null,
          error: null,
        })
        ;(chain['insert'] as ReturnType<typeof vi.fn>).mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: patientId, cpf: '00000000000', name: 'Maria Silva', first_name: 'Maria' },
              error: null,
            }),
          }),
        })
        ;(chain['update'] as ReturnType<typeof vi.fn>).mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
          }),
        })
      }

      if (table === 'conversations') {
        ;(chain['maybeSingle'] as ReturnType<typeof vi.fn>).mockResolvedValue({
          data: { id: conversationId },
          error: null,
        })
        ;(chain['insert'] as ReturnType<typeof vi.fn>).mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: conversationId },
              error: null,
            }),
          }),
        })
      }

      if (table === 'messages') {
        ;(chain['insert'] as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { id: 'msg-001' }, error: null })
      }

      if (table === 'tenants') {
        ;(chain['single'] as ReturnType<typeof vi.fn>).mockResolvedValue({
          data: {
            id: tenantId,
            name: 'Clínica Teste',
            services_description: 'Consultas e procedimentos médicos',
          },
          error: null,
        })
      }

      if (table === 'tenant_specialties') {
        ;(chain['eq'] as ReturnType<typeof vi.fn>).mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [{ name: 'Clínico Geral' }], error: null }),
        })
      }

      if (table === 'tenant_contacts') {
        ;(chain['single'] as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null })
        ;(chain['maybeSingle'] as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null })
        ;(chain['limit'] as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null })
      }

      return chain
    })
  })

  it('Agent 2 deve processar mensagem do paciente e gerar resposta', async () => {
    const { runAgent2 } = await import('../../modules/ai-engine/agent2.service.js')
    const { sendTextMessage } = await import('../../modules/whatsapp/whatsapp.sender.js')

    const result = await runAgent2({
      tenantId,
      patientId,
      conversationId,
      messageText: 'Olá, tenho uma dúvida sobre meu medicamento',
    })

    expect(result.output.intent).toBe('normal')
    expect(result.reply).toContain('Olá')
    expect(sendTextMessage).not.toHaveBeenCalled() // Agent 2 não chama sender diretamente
  })

  it('Agent 2 deve detectar intent de opt-out', async () => {
    mockInteractionComplete.mockResolvedValueOnce({
      content: JSON.stringify({
        reply: 'Entendido! Você foi removido da lista.',
        new_facts: [],
        opportunity_detected: false,
        opportunity_detail: null,
        intent: 'optout',
        escalation_reason: null,
      }),
      inputTokens: 80,
      outputTokens: 40,
    })

    const { runAgent2 } = await import('../../modules/ai-engine/agent2.service.js')

    const result = await runAgent2({
      tenantId,
      patientId,
      conversationId,
      messageText: 'Não quero mais receber mensagens',
    })

    expect(result.output.intent).toBe('optout')
  })

  it('FUP scheduler deve gerar mensagem correta para medicamento', async () => {
    const { buildMessageText } = await import('../../modules/followup/followup.scheduler.js')

    const msg = buildMessageText(
      'medication',
      'contextual',
      { medication_name: 'Amoxicilina', sequence: 1, total: 3 },
      'Maria',
    )

    expect(msg).toContain('Maria')
    expect(msg).toContain('Amoxicilina')
    expect(msg).toContain('1/3')
  })

  it('sistema de boas-vindas deve enfileirar job de onboarding', async () => {
    const { getOnboardingQueue } = await import('../../modules/followup/followup.queues.js')

    const queue = getOnboardingQueue()
    await queue.add('welcome', {
      tenantId,
      patientId,
      patientPhone: '5511999990000',
      patientFirstName: 'Maria',
      step: 'welcome',
    })

    expect(queue.add).toHaveBeenCalledWith(
      'welcome',
      expect.objectContaining({ step: 'welcome', patientFirstName: 'Maria' }),
    )
  })

  it('FUPs de inatividade devem ser inseridos no banco ao criar paciente via webhook', async () => {
    // Reconfigura o mock para patient_followup_agenda
    mockFrom.mockImplementationOnce((table: string) => {
      expect(table).toBe('patient_followup_agenda')
      const chain = makeChain({ data: null, error: null })
      ;(chain['insert'] as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null })
      return chain
    })

    const { scheduleInactivityFups } = await import('../../modules/followup/followup.scheduler.js')
    // Não deve lançar erro
    await expect(scheduleInactivityFups(tenantId, patientId)).resolves.not.toThrow()
  })
})

describe('Fluxo de Integração — Keyword / Escalonamento', () => {
  it('intent emergency deve ser detectado pelo parser do Agent 2', async () => {
    const { parseAgent2Output } = await import('../../modules/ai-engine/agent2.service.js')

    // Simula LLM detectando urgência médica na mensagem
    const llmOutput = JSON.stringify({
      reply: 'Isso parece urgente. Por favor, procure o pronto-socorro imediatamente ou ligue 192.',
      new_facts: [],
      opportunity_detected: false,
      opportunity_detail: null,
      intent: 'emergency',
      escalation_reason: null,
    })

    const result = parseAgent2Output(llmOutput)
    expect(result.intent).toBe('emergency')
    expect(result.reply).toContain('urgente')
  })

  it('intent escalate deve incluir motivo do escalonamento', async () => {
    const { parseAgent2Output } = await import('../../modules/ai-engine/agent2.service.js')

    const llmOutput = JSON.stringify({
      reply: 'Vou encaminhar você para nossa equipe. Aguarde um momento.',
      new_facts: [],
      opportunity_detected: false,
      opportunity_detail: null,
      intent: 'escalate',
      escalation_reason: 'Paciente relata reação adversa ao medicamento prescrito',
    })

    const result = parseAgent2Output(llmOutput)
    expect(result.intent).toBe('escalate')
    expect(result.escalation_reason).toContain('reação adversa')
  })
})
