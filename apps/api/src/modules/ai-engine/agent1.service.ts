import { getSupabaseClient } from '../../infra/supabase.js'
import { getAnalysisProvider } from './llm-provider.js'
import type { Agent1Output } from './ai-engine.types.js'
import { trackAiUsage } from './ai-engine.usage.js'

// =============================================================================
// Agent 1 — Análise de Documentos
// =============================================================================
// Roda ao:
//   - Cadastrar paciente com documentos
//   - Fazer upload de novo documento
//   - Secretária solicitar reprocessamento manual
//
// Responsabilidades:
//   1. Ler texto do documento (PDF extraído pelo caller, ou texto livre)
//   2. Extrair: medicamentos, exames, retornos, orientações
//   3. Montar agenda de FUPs personalizada (patient_followup_agenda)
//   4. Atualizar extracted_data no patient_documents
//   5. Atualizar interaction_summary no patient
// =============================================================================

const SYSTEM_PROMPT = `Você é um assistente clínico especializado em extrair informações de documentos médicos.
Analise o documento fornecido e extraia as informações no formato JSON especificado.
Seja preciso e conservador — só extraia o que está explicitamente no documento.
Responda APENAS com JSON válido, sem markdown, sem explicações.`

function buildExtractionPrompt(documentText: string, patientName: string): string {
  return `Paciente: ${patientName}

Documento:
${documentText.slice(0, 8000)}

Extraia as informações em JSON com EXATAMENTE esta estrutura:
{
  "medications": [
    {
      "name": "nome do medicamento",
      "dosage": "dose (ex: 500mg)",
      "frequency": "frequência (ex: 2x ao dia)",
      "duration_days": 30
    }
  ],
  "exams": [
    {
      "name": "nome do exame",
      "urgency": "routine",
      "notes": "observações se houver"
    }
  ],
  "return_appointments": [
    {
      "specialty": "especialidade",
      "date_hint": "prazo ou data mencionada",
      "notes": "observações"
    }
  ],
  "instructions": ["orientação 1", "orientação 2"],
  "summary": "Resumo narrativo da consulta em 2-3 frases"
}

Regras:
- duration_days: null se não informado
- urgency: "routine" ou "urgent"
- instructions: apenas orientações do médico ao paciente
- summary: em português, linguagem simples para o paciente
- Arrays vazios [] se não houver dados daquele tipo`
}

function parseAgent1Output(raw: string): Agent1Output {
  // Remove possíveis blocos de código markdown
  const cleaned = raw
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```$/m, '')
    .trim()

  const parsed = JSON.parse(cleaned) as Partial<Agent1Output>

  // LLM Trust Boundary: garantir tipos corretos e limitar tamanhos
  const safeMedications = (Array.isArray(parsed.medications) ? parsed.medications : [])
    .filter((m): m is NonNullable<typeof m> => typeof m === 'object' && m !== null)
    .slice(0, 20)

  const safeExams = (Array.isArray(parsed.exams) ? parsed.exams : [])
    .filter((e): e is NonNullable<typeof e> => typeof e === 'object' && e !== null)
    .slice(0, 20)

  const safeReturns = (Array.isArray(parsed.return_appointments)
    ? parsed.return_appointments
    : []
  )
    .filter((r): r is NonNullable<typeof r> => typeof r === 'object' && r !== null)
    .slice(0, 10)

  const safeInstructions = (Array.isArray(parsed.instructions) ? parsed.instructions : [])
    .filter((i): i is string => typeof i === 'string')
    .map((i) => i.slice(0, 500))
    .slice(0, 20)

  return {
    medications: safeMedications,
    exams: safeExams,
    return_appointments: safeReturns,
    instructions: safeInstructions,
    summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 1000) : '',
  }
}

// ---------------------------------------------------------------------------
// Agenda de FUPs baseada nos dados extraídos
// ---------------------------------------------------------------------------

interface FupEntry {
  patient_id: string
  tenant_id: string
  source: 'contextual'
  trigger_type: 'medication' | 'exam' | 'return' | 'custom'
  trigger_detail: Record<string, unknown>
  scheduled_date: string
  status: 'pending'
}

function buildFollowupAgenda(
  patientId: string,
  tenantId: string,
  output: Agent1Output,
  baseDate: Date,
): FupEntry[] {
  const entries: FupEntry[] = []

  // Medicamentos: FUP a cada 2 dias durante a duração do tratamento
  for (const med of output.medications) {
    const durationDays = med.duration_days ?? 30
    const intervalDays = 2
    const maxFups = Math.min(Math.floor(durationDays / intervalDays), 10)

    for (let i = 1; i <= maxFups; i++) {
      const scheduledDate = addBusinessDays(baseDate, i * intervalDays)
      entries.push({
        patient_id: patientId,
        tenant_id: tenantId,
        source: 'contextual',
        trigger_type: 'medication',
        trigger_detail: {
          medication_name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          sequence: i,
          total: maxFups,
        },
        scheduled_date: scheduledDate.toISOString().split('T')[0]!,
        status: 'pending',
      })
    }
  }

  // Exames: FUP em D+3
  for (const exam of output.exams) {
    const scheduledDate = addBusinessDays(baseDate, 3)
    entries.push({
      patient_id: patientId,
      tenant_id: tenantId,
      source: 'contextual',
      trigger_type: 'exam',
      trigger_detail: {
        exam_name: exam.name,
        urgency: exam.urgency ?? 'routine',
        notes: exam.notes ?? null,
      },
      scheduled_date: scheduledDate.toISOString().split('T')[0]!,
      status: 'pending',
    })
  }

  // Retornos: FUP em D-2 antes do retorno (estimativa: 30 dias se não especificado)
  for (const ret of output.return_appointments) {
    const estimatedReturnDays = 30
    const scheduledDate = addBusinessDays(baseDate, estimatedReturnDays - 2)
    entries.push({
      patient_id: patientId,
      tenant_id: tenantId,
      source: 'contextual',
      trigger_type: 'return',
      trigger_detail: {
        specialty: ret.specialty ?? null,
        date_hint: ret.date_hint ?? null,
        notes: ret.notes ?? null,
      },
      scheduled_date: scheduledDate.toISOString().split('T')[0]!,
      status: 'pending',
    })
  }

  return entries
}

/**
 * Avança N dias úteis (seg-sex) a partir da data base.
 */
function addBusinessDays(from: Date, days: number): Date {
  const result = new Date(from)
  let added = 0
  while (added < days) {
    result.setDate(result.getDate() + 1)
    const dow = result.getDay()
    if (dow !== 0 && dow !== 6) added++
  }
  return result
}

// ---------------------------------------------------------------------------
// Função principal
// ---------------------------------------------------------------------------

export interface RunAgent1Input {
  documentId: string
  patientId: string
  tenantId: string
  /** Texto extraído do documento (PDF → texto) */
  documentText: string
  patientName: string
}

export async function runAgent1(input: RunAgent1Input): Promise<Agent1Output> {
  const { documentId, patientId, tenantId, documentText, patientName } = input

  const provider = getAnalysisProvider()
  const prompt = buildExtractionPrompt(documentText, patientName)

  const result = await provider.complete({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    temperature: 0.1, // Alta consistência para extração
    maxTokens: 2048,
    jsonMode: true,
  })

  // Rastrear tokens
  await trackAiUsage(tenantId, {
    ai_tokens_input: result.inputTokens,
    ai_tokens_output: result.outputTokens,
    documents_processed: 1,
  })

  let output: Agent1Output
  try {
    output = parseAgent1Output(result.content)
  } catch (err) {
    console.error('[Agent1] Erro ao parsear output:', result.content, err)
    output = {
      medications: [],
      exams: [],
      return_appointments: [],
      instructions: [],
      summary: 'Não foi possível processar o documento automaticamente.',
    }
  }

  const supabase = getSupabaseClient()

  // 1. Atualizar extracted_data no documento
  await supabase
    .from('patient_documents')
    .update({ extracted_data: output })
    .eq('id', documentId)
    .eq('tenant_id', tenantId)

  // 2. Criar agenda de FUPs
  const agenda = buildFollowupAgenda(patientId, tenantId, output, new Date())
  if (agenda.length > 0) {
    // Cancelar FUPs anteriores pendentes (contextual) para evitar duplicatas
    await supabase
      .from('patient_followup_agenda')
      .update({ status: 'cancelled' })
      .eq('patient_id', patientId)
      .eq('tenant_id', tenantId)
      .eq('source', 'contextual')
      .eq('status', 'pending')

    await supabase.from('patient_followup_agenda').insert(agenda)
  }

  // 3. Atualizar interaction_summary do paciente
  if (output.summary) {
    await supabase
      .from('patients')
      .update({ interaction_summary: output.summary })
      .eq('id', patientId)
      .eq('tenant_id', tenantId)
  }

  return output
}
