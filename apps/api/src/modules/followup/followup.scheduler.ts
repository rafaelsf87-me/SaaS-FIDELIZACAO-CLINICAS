import { getSupabaseClient } from '../../infra/supabase.js'
import { getFollowupQueue } from './followup.queues.js'
import type { FollowupJobData } from './followup.queues.js'

// -----------------------------------------------------------------------
// Helpers de dias úteis
// -----------------------------------------------------------------------

function isWeekend(date: Date): boolean {
  const dow = date.getDay()
  return dow === 0 || dow === 6
}

export function addBusinessDays(from: Date, days: number): Date {
  const result = new Date(from)
  let added = 0
  while (added < days) {
    result.setDate(result.getDate() + 1)
    if (!isWeekend(result)) added++
  }
  return result
}

// -----------------------------------------------------------------------
// Construtor de mensagem
// Gera texto adequado baseado no tipo e fonte do FUP.
// -----------------------------------------------------------------------

export function buildMessageText(
  triggerType: string,
  source: string,
  triggerDetail: Record<string, unknown>,
  patientFirstName: string,
): string {
  const name = patientFirstName || 'paciente'

  if (source === 'inactivity') {
    const days = (triggerDetail.inactivity_days as number) ?? 7
    if (days <= 7) {
      return (
        `Olá, ${name}! 😊 Espero que esteja bem após sua consulta. ` +
        `Tem alguma dúvida sobre seu tratamento ou precisa agendar um retorno? É só me chamar!`
      )
    } else if (days <= 15) {
      return (
        `Olá, ${name}! Passando para saber como você está se sentindo. ` +
        `Como está indo com o seu tratamento? Posso ajudar com algo?`
      )
    } else {
      return (
        `Olá, ${name}! Faz um tempinho que não nos falamos. ` +
        `Está tudo bem? Lembre-se que estamos à disposição para dúvidas ou para agendar seu próximo retorno. 😊`
      )
    }
  }

  switch (triggerType) {
    case 'medication': {
      const medName = (triggerDetail.medication_name as string) ?? 'seu medicamento'
      const seq = (triggerDetail.sequence as number) ?? 1
      const total = (triggerDetail.total as number) ?? 1
      return (
        `Olá, ${name}! Lembrete sobre *${medName}* (${seq}/${total}). ` +
        `Está conseguindo tomar corretamente? Tem alguma dúvida ou desconforto?`
      )
    }

    case 'exam': {
      const examName = (triggerDetail.exam_name as string) ?? 'o exame solicitado'
      return (
        `Olá, ${name}! Passando para lembrar de agendar o exame *${examName}*. ` +
        `Já conseguiu marcar? Precisa de ajuda?`
      )
    }

    case 'return': {
      const specialty = (triggerDetail.specialty as string) ?? null
      return specialty
        ? (
          `Olá, ${name}! Lembrete para agendar seu retorno com *${specialty}*. ` +
          `Precisa de ajuda para marcar a consulta?`
        )
        : (
          `Olá, ${name}! Lembrete para agendar seu retorno médico. ` +
          `Precisa de ajuda para marcar a consulta?`
        )
    }

    default:
      return `Olá, ${name}! Temos um recado da clínica para você. Como posso ajudar?`
  }
}

// -----------------------------------------------------------------------
// Tick principal do scheduler
// Consulta agenda pendente e enfileira jobs para envio.
// -----------------------------------------------------------------------

async function processDueAgendaItems(): Promise<void> {
  // Seg-sex apenas
  if (isWeekend(new Date())) return

  const supabase = getSupabaseClient()
  const todayStr = new Date().toISOString().split('T')[0]! // YYYY-MM-DD

  const { data: items, error } = await supabase
    .from('patient_followup_agenda')
    .select(`
      id,
      tenant_id,
      patient_id,
      source,
      trigger_type,
      trigger_detail,
      patients (
        first_name,
        phone_whatsapp,
        enabled,
        opt_out
      )
    `)
    .eq('status', 'pending')
    .lte('scheduled_date', todayStr)
    .limit(200)

  if (error) {
    console.error('[FollowupScheduler] Erro ao consultar agenda:', error.message)
    return
  }

  if (!items?.length) return

  const queue = getFollowupQueue()
  let enqueued = 0
  let skipped = 0

  for (const item of items) {
    // Supabase retorna join como objeto único (FK many-to-one)
    // Cast via unknown necessário pois o SDK tipifica como array
    const patient = item.patients as unknown as {
      first_name: string | null
      phone_whatsapp: string | null
      enabled: boolean | null
      opt_out: boolean | null
    } | null

    // Sem telefone ou paciente inativo → cancelar item
    if (!patient?.phone_whatsapp || !patient.enabled || patient.opt_out) {
      await supabase
        .from('patient_followup_agenda')
        .update({ status: 'cancelled' })
        .eq('id', item.id)
      skipped++
      continue
    }

    const triggerDetail = (item.trigger_detail as Record<string, unknown>) ?? {}
    const firstName = patient.first_name ?? patient.phone_whatsapp
    const messageText = buildMessageText(
      item.trigger_type as string,
      item.source as string,
      triggerDetail,
      firstName,
    )

    const jobData: FollowupJobData = {
      agendaId: item.id as string,
      tenantId: item.tenant_id as string,
      patientId: item.patient_id as string,
      patientPhone: patient.phone_whatsapp,
      patientFirstName: firstName,
      messageText,
      source: item.source as string,
    }

    // jobId = agendaId garante idempotência (não duplica se o scheduler rodar 2x antes do worker)
    await queue.add('send-followup', jobData, { jobId: item.id as string })
    enqueued++
  }

  if (enqueued > 0 || skipped > 0) {
    console.info(`[FollowupScheduler] Tick: ${enqueued} enfileirados, ${skipped} cancelados`)
  }
}

// -----------------------------------------------------------------------
// FUPs de inatividade — agenda os 3 checkpoints (D+7, D+15, D+30)
// Chamado ao criar novo paciente via webhook.
// -----------------------------------------------------------------------

export async function scheduleInactivityFups(
  tenantId: string,
  patientId: string,
): Promise<void> {
  const supabase = getSupabaseClient()
  const today = new Date()

  const fups = [7, 15, 30].map((days) => ({
    patient_id: patientId,
    tenant_id: tenantId,
    source: 'inactivity',
    trigger_type: 'custom',
    trigger_detail: { inactivity_days: days },
    scheduled_date: addBusinessDays(today, days).toISOString().split('T')[0]!,
    status: 'pending',
  }))

  const { error } = await supabase.from('patient_followup_agenda').insert(fups)
  if (error) {
    console.error('[FollowupScheduler] Erro ao criar FUPs de inatividade:', error.message)
  }
}

// -----------------------------------------------------------------------
// Cancelar FUPs de inatividade pendentes
// Chamado quando paciente interage via WhatsApp.
// -----------------------------------------------------------------------

export async function cancelInactivityFups(
  tenantId: string,
  patientId: string,
): Promise<void> {
  const supabase = getSupabaseClient()
  await supabase
    .from('patient_followup_agenda')
    .update({ status: 'cancelled' })
    .eq('tenant_id', tenantId)
    .eq('patient_id', patientId)
    .eq('source', 'inactivity')
    .eq('status', 'pending')
}

// -----------------------------------------------------------------------
// Scheduler loop — setInterval a cada 5 min
// -----------------------------------------------------------------------

const INTERVAL_MS = 5 * 60 * 1000 // 5 minutos

let schedulerHandle: ReturnType<typeof setInterval> | null = null

export function startFollowupScheduler(): void {
  if (schedulerHandle) return // já está rodando

  // Primeiro tick imediato
  void processDueAgendaItems().catch((err) =>
    console.error('[FollowupScheduler] Erro no primeiro tick:', err),
  )

  schedulerHandle = setInterval(() => {
    void processDueAgendaItems().catch((err) =>
      console.error('[FollowupScheduler] Erro no tick:', err),
    )
  }, INTERVAL_MS)

  console.info('[FollowupScheduler] Iniciado — intervalo: 5min, seg-sex')
}

export function stopFollowupScheduler(): void {
  if (schedulerHandle) {
    clearInterval(schedulerHandle)
    schedulerHandle = null
  }
}
