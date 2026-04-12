import { Worker } from 'bullmq'
import { getSupabaseClient } from '../../infra/supabase.js'
import { createRedisConnection } from '../../infra/redis.js'
import { sendTextMessage } from '../whatsapp/whatsapp.sender.js'
import { logAudit } from '../audit/audit.service.js'
import type { FollowupJobData, OnboardingJobData } from './followup.queues.js'

// -----------------------------------------------------------------------
// Followup processor worker
// Processa FUPs enfileirados pelo scheduler.
// Re-verifica o estado do paciente antes de enviar para evitar envios indevidos.
// -----------------------------------------------------------------------

export function startFollowupWorker(): Worker<FollowupJobData> {
  const worker = new Worker<FollowupJobData>(
    'followup-processor',
    async (job) => {
      const { agendaId, tenantId, patientId, patientPhone, source } = job.data
      const supabase = getSupabaseClient()

      // Re-verificar estado atual do paciente
      const { data: patient } = await supabase
        .from('patients')
        .select('enabled, opt_out')
        .eq('id', patientId)
        .eq('tenant_id', tenantId)
        .single()

      if (!patient || !patient.enabled || patient.opt_out) {
        await supabase
          .from('patient_followup_agenda')
          .update({ status: 'cancelled' })
          .eq('id', agendaId)
        return
      }

      // FUP de inatividade: cancelar se paciente interagiu após criação do item
      if (source === 'inactivity') {
        const { data: agendaItem } = await supabase
          .from('patient_followup_agenda')
          .select('created_at')
          .eq('id', agendaId)
          .single()

        if (agendaItem) {
          // Buscar IDs das conversas do paciente
          const { data: convs } = await supabase
            .from('conversations')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('patient_id', patientId)

          const convIds = (convs ?? []).map((c) => c.id as string)

          if (convIds.length > 0) {
            const { data: recentMsg } = await supabase
              .from('messages')
              .select('id')
              .eq('tenant_id', tenantId)
              .eq('direction', 'inbound')
              .in('conversation_id', convIds)
              .gt('created_at', agendaItem.created_at as string)
              .limit(1)
              .maybeSingle()

            if (recentMsg) {
              // Paciente interagiu — FUP de inatividade não é mais necessário
              await supabase
                .from('patient_followup_agenda')
                .update({ status: 'cancelled' })
                .eq('id', agendaId)
              return
            }
          }
        }
      }

      // Enviar mensagem
      await sendTextMessage(tenantId, patientPhone, job.data.messageText)

      // Registrar envio
      await supabase
        .from('patient_followup_agenda')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', agendaId)
    },
    { connection: createRedisConnection(), concurrency: 5 },
  )

  worker.on('failed', (job, err) => {
    console.error(`[FollowupWorker] Job ${job?.id} falhou:`, err.message)
    if (job?.data) {
      const { tenantId, patientId, agendaId } = job.data
      void logAudit({
        tenantId,
        patientId,
        action: 'followup_send_failed',
        details: { job_id: job.id, agenda_id: agendaId, error: err.message },
        actor: 'system',
      })
    }
  })

  return worker
}

// -----------------------------------------------------------------------
// Onboarding worker
// Processa mensagens de boas-vindas e resumo pós-consulta.
// -----------------------------------------------------------------------

export function startOnboardingWorker(): Worker<OnboardingJobData> {
  const worker = new Worker<OnboardingJobData>(
    'onboarding',
    async (job) => {
      const { tenantId, patientPhone, patientFirstName, step, summary } = job.data

      if (step === 'welcome') {
        const msg =
          `Olá, ${patientFirstName}! 👋 Obrigado por entrar em contato com nossa clínica. ` +
          `Estou aqui para te ajudar com informações sobre seus tratamentos e agendamentos. ` +
          `Como posso te ajudar?`
        await sendTextMessage(tenantId, patientPhone, msg)
      } else if (step === 'summary' && summary) {
        const msg =
          `📋 *Resumo da sua consulta:*\n\n${summary}\n\n` +
          `Se tiver qualquer dúvida sobre seu tratamento, é só me chamar!`
        await sendTextMessage(tenantId, patientPhone, msg)
      }
    },
    { connection: createRedisConnection(), concurrency: 3 },
  )

  worker.on('failed', (job, err) => {
    console.error(`[OnboardingWorker] Job ${job?.id} falhou:`, err.message)
    if (job?.data) {
      const { tenantId, patientId } = job.data
      void logAudit({
        tenantId,
        patientId,
        action: 'onboarding_send_failed',
        details: { job_id: job.id, step: job.data.step, error: err.message },
        actor: 'system',
      })
    }
  })

  return worker
}
