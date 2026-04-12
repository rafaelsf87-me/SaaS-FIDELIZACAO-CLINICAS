import { createHmac, timingSafeEqual } from 'node:crypto'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { getSupabaseClient } from '../../infra/supabase.js'
import { sendTextMessage } from './whatsapp.sender.js'
import { transcribeWhatsAppAudio, estimateAudioMinutes } from '../ai-engine/whisper.service.js'
import { runAgent2 } from '../ai-engine/agent2.service.js'
import { trackAiUsage } from '../ai-engine/ai-engine.usage.js'
import { scheduleInactivityFups, cancelInactivityFups } from '../followup/followup.scheduler.js'
import { getOnboardingQueue } from '../followup/followup.queues.js'
import { logAudit } from '../audit/audit.service.js'
import type {
  MetaWebhookPayload,
  MetaChangeValue,
  MetaMessage,
  MetaStatus,
} from './whatsapp.types.js'

const MOCK = process.env.WHATSAPP_MOCK === 'true'

// -----------------------------------------------------------------------
// Signature validation
// -----------------------------------------------------------------------

function validateSignature(rawBody: Buffer, signature: string | undefined): boolean {
  if (MOCK) return true

  const appSecret = process.env.META_APP_SECRET
  if (!appSecret) {
    console.error('[WhatsApp] META_APP_SECRET não configurado — rejeitando webhook')
    return false
  }

  if (!signature?.startsWith('sha256=')) return false

  const expected = createHmac('sha256', appSecret).update(rawBody).digest('hex')
  const received = signature.slice(7) // remove 'sha256='

  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'))
  } catch {
    return false
  }
}

// -----------------------------------------------------------------------
// Tenant lookup by phone_number_id
// -----------------------------------------------------------------------

async function findTenantByPhoneNumberId(phoneNumberId: string): Promise<string | null> {
  const supabase = getSupabaseClient()
  const { data } = await supabase
    .from('tenants')
    .select('id')
    .eq('waba_phone_number_id', phoneNumberId)
    .maybeSingle()

  // Fallback: se só tem um tenant e o phoneNumberId bate com env var
  if (!data && process.env.META_PHONE_NUMBER_ID === phoneNumberId) {
    const { data: fallback } = await supabase
      .from('tenants')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)
      .single()
    return fallback?.id ?? null
  }

  return data?.id ?? null
}

// -----------------------------------------------------------------------
// Patient: find or create
// Returns id, opt_out and enabled so we can skip processing for opted-out patients
// -----------------------------------------------------------------------

interface PatientRecord {
  id: string
  opt_out: boolean
  enabled: boolean
  /** true se o paciente foi criado agora (primeira mensagem) */
  isNew: boolean
}

async function findOrCreatePatient(
  tenantId: string,
  phone: string,
  displayName: string,
): Promise<PatientRecord> {
  const supabase = getSupabaseClient()

  const { data: existing } = await supabase
    .from('patients')
    .select('id, opt_out, enabled')
    .eq('tenant_id', tenantId)
    .eq('phone_whatsapp', phone)
    .maybeSingle()

  if (existing) {
    return {
      id: existing.id as string,
      opt_out: Boolean(existing.opt_out),
      enabled: Boolean(existing.enabled),
      isNew: false,
    }
  }

  // Upsert com ON CONFLICT para evitar race condition em webhooks duplicados.
  // O índice UNIQUE (tenant_id, phone_whatsapp) garante idempotência.
  const { data: created, error } = await supabase
    .from('patients')
    .upsert(
      {
        tenant_id: tenantId,
        name: displayName || phone,
        first_name: displayName.split(' ')[0] ?? phone,
        phone_whatsapp: phone,
        status: 'active',
        // CPF placeholder para pacientes criados via webhook (sem CPF disponível)
        cpf: `wa_${phone}`,
      },
      { onConflict: 'tenant_id,phone_whatsapp', ignoreDuplicates: false },
    )
    .select('id, opt_out, enabled')
    .single()

  if (error) throw new Error(`Erro ao criar/upsert paciente: ${error.message}`)
  return {
    id: created.id as string,
    opt_out: Boolean(created.opt_out),
    enabled: Boolean(created.enabled),
    isNew: true,
  }
}

// -----------------------------------------------------------------------
// Conversation: find active or create
// -----------------------------------------------------------------------

async function findOrCreateConversation(
  tenantId: string,
  patientId: string,
  waConversationId?: string,
): Promise<string> {
  const supabase = getSupabaseClient()

  // Tenta encontrar conversa ativa (not closed/cancelled)
  const { data: active } = await supabase
    .from('conversations')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('patient_id', patientId)
    .in('status', ['active', 'escalated'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (active) {
    // Atualiza last_message_at e whatsapp_conversation_id se disponível
    await supabase
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        ...(waConversationId ? { whatsapp_conversation_id: waConversationId } : {}),
      })
      .eq('id', active.id)

    return active.id
  }

  const { data: created, error } = await supabase
    .from('conversations')
    .insert({
      tenant_id: tenantId,
      patient_id: patientId,
      status: 'active',
      last_message_at: new Date().toISOString(),
      ...(waConversationId ? { whatsapp_conversation_id: waConversationId } : {}),
    })
    .select('id')
    .single()

  if (error) throw new Error(`Erro ao criar conversa: ${error.message}`)
  return created.id
}

// -----------------------------------------------------------------------
// Save incoming message
// Returns the text content that should be processed by Agent 2
// For audio: transcribes via Whisper and saves transcription
// -----------------------------------------------------------------------

interface SavedMessage {
  /** Texto a ser enviado para o Agent 2 (inclui transcrição de áudio) */
  textForAgent: string | null
  /** true se a mensagem deve acionar Agent 2 */
  shouldProcessAI: boolean
}

async function saveIncomingMessage(
  tenantId: string,
  conversationId: string,
  msg: MetaMessage,
  waToken: string,
): Promise<SavedMessage> {
  const supabase = getSupabaseClient()

  let content = ''
  let messageType = msg.type as string
  let audioTranscription: string | null = null
  let audioMinutes = 0

  switch (msg.type) {
    case 'text':
      content = msg.text?.body ?? ''
      messageType = 'text'
      break

    case 'audio': {
      // Transcrever via Whisper antes de salvar
      const mediaId = msg.audio?.id
      if (mediaId) {
        audioTranscription = await transcribeWhatsAppAudio(mediaId, waToken)
        // Estimativa de minutos (tamanho desconhecido aqui — usar estimativa por duração padrão)
        audioMinutes = estimateAudioMinutes(50_000) // ~50KB estimado para áudio típico
      }
      content = audioTranscription ? `[Áudio] ${audioTranscription}` : '[Áudio]'
      messageType = 'audio'
      break
    }

    case 'image':
      content = msg.image?.caption ?? '[Imagem]'
      messageType = 'image'
      break
    case 'document':
      content = msg.document?.caption ?? msg.document?.filename ?? '[Documento]'
      messageType = 'document'
      break
    case 'video':
      content = msg.video?.caption ?? '[Vídeo]'
      messageType = 'video'
      break
    case 'contacts':
      content = msg.contacts?.map((c) => c.name.formatted_name).join(', ') ?? '[Contatos]'
      messageType = 'contacts'
      break
    case 'location':
      content = msg.location?.name
        ? `[Localização: ${msg.location.name}]`
        : '[Localização]'
      messageType = 'location'
      break
    default:
      content = `[${msg.type}]`
      messageType = 'unsupported'
  }

  const { error } = await supabase.from('messages').insert({
    tenant_id: tenantId,
    conversation_id: conversationId,
    direction: 'inbound',
    content,
    message_type: messageType,
    audio_transcription: audioTranscription,
    wa_message_id: msg.id,
    wa_status: null,
    created_at: new Date(parseInt(msg.timestamp, 10) * 1000).toISOString(),
  })

  if (error) {
    if (!error.message.includes('duplicate') && !error.code?.includes('23505')) {
      throw new Error(`Erro ao salvar mensagem: ${error.message}`)
    }
    // Duplicata — não processar de novo
    return { textForAgent: null, shouldProcessAI: false }
  }

  // Rastrear áudio se transcrito
  if (audioMinutes > 0) {
    await trackAiUsage(tenantId, { audio_minutes_processed: audioMinutes })
  }

  // Tipos que o Agent 2 processa: texto e áudio (com ou sem transcrição)
  const processableTypes = ['text', 'audio']
  const shouldProcessAI = processableTypes.includes(messageType)

  // Texto para o agente: preferir transcrição de áudio; para outros tipos = null
  const textForAgent = shouldProcessAI
    ? audioTranscription ?? (msg.type === 'text' ? (msg.text?.body ?? null) : null)
    : null

  return { textForAgent, shouldProcessAI: shouldProcessAI && textForAgent !== null }
}

// -----------------------------------------------------------------------
// Update message status (sent → delivered → read / failed)
// -----------------------------------------------------------------------

async function updateMessageStatus(tenantId: string, status: MetaStatus): Promise<void> {
  const supabase = getSupabaseClient()
  await supabase
    .from('messages')
    .update({ wa_status: status.status })
    .eq('wa_message_id', status.id)
    .eq('tenant_id', tenantId)
}

// -----------------------------------------------------------------------
// Buscar token WhatsApp do tenant
// -----------------------------------------------------------------------

async function getTenantWaToken(tenantId: string): Promise<string> {
  const supabase = getSupabaseClient()
  const { data } = await supabase
    .from('tenants')
    .select('waba_access_token')
    .eq('id', tenantId)
    .single()
  return (data?.waba_access_token as string | null) ?? process.env.META_WHATSAPP_TOKEN ?? ''
}

// -----------------------------------------------------------------------
// Process a single change value
// -----------------------------------------------------------------------

async function processChange(value: MetaChangeValue): Promise<void> {
  const phoneNumberId = value.metadata.phone_number_id
  const tenantId = await findTenantByPhoneNumberId(phoneNumberId)

  if (!tenantId) {
    console.warn(`[WhatsApp] phone_number_id não reconhecido: ${phoneNumberId}`)
    return
  }

  // Handle incoming messages
  if (value.messages?.length) {
    const contactMap = new Map(value.contacts?.map((c) => [c.wa_id, c.profile.name]) ?? [])
    const waToken = await getTenantWaToken(tenantId)

    for (const msg of value.messages) {
      const displayName = contactMap.get(msg.from) ?? msg.from
      const patient = await findOrCreatePatient(tenantId, msg.from, displayName)

      // Paciente com opt-out ou desativado — não processar
      if (patient.opt_out || !patient.enabled) {
        console.info(
          `[WhatsApp] Mensagem ignorada: paciente ${patient.id} tem opt_out=${patient.opt_out} enabled=${patient.enabled}`,
        )
        continue
      }

      const conversationId = await findOrCreateConversation(tenantId, patient.id)
      const { textForAgent, shouldProcessAI } = await saveIncomingMessage(
        tenantId,
        conversationId,
        msg,
        waToken,
      )

      // Novo paciente: agendar FUPs de inatividade + enviar boas-vindas
      if (patient.isNew) {
        scheduleInactivityFups(tenantId, patient.id).catch((err) =>
          console.error('[WhatsApp] Erro ao agendar FUPs de inatividade:', err),
        )

        // Welcome apenas quando Agent 2 não vai responder (imagens, vídeos, etc.)
        // Para texto/áudio o Agent 2 já inclui a saudação no reply
        if (!shouldProcessAI && process.env.REDIS_URL) {
          const firstName = displayName.split(' ')[0] ?? displayName
          getOnboardingQueue()
            .add('welcome', {
              tenantId,
              patientId: patient.id,
              patientPhone: msg.from,
              patientFirstName: firstName,
              step: 'welcome',
            })
            .catch((err) => console.error('[WhatsApp] Erro ao enfileirar onboarding:', err))
        }
      } else {
        // Paciente existente interagindo → cancelar FUPs de inatividade pendentes
        cancelInactivityFups(tenantId, patient.id).catch((err) =>
          console.error('[WhatsApp] Erro ao cancelar FUPs de inatividade:', err),
        )
      }

      // Disparar Agent 2 se há texto processável
      if (shouldProcessAI && textForAgent) {
        try {
          const { output, reply } = await runAgent2({
            tenantId,
            patientId: patient.id,
            conversationId,
            messageText: textForAgent,
          })

          // Enviar resposta via WhatsApp (exceto se opt-out processado agora)
          if (output.intent !== 'optout') {
            await sendTextMessage(tenantId, msg.from, reply)
          }
        } catch (agentErr) {
          console.error('[WhatsApp] Erro no Agent 2:', agentErr)
          // Logar falha no audit log sem bloquear o webhook
          void logAudit({
            tenantId,
            patientId: patient.id,
            action: 'ai_agent2_failed',
            details: {
              error: agentErr instanceof Error ? agentErr.message : String(agentErr),
              wa_message_id: msg.id,
              message_type: msg.type,
            },
            actor: 'ai',
          })
        }
      }
    }
  }

  // Handle status updates
  if (value.statuses?.length) {
    for (const status of value.statuses) {
      await updateMessageStatus(tenantId, status)
    }
  }
}

// -----------------------------------------------------------------------
// Fastify routes
// -----------------------------------------------------------------------

export async function whatsappWebhookRoutes(app: FastifyInstance) {
  // Registrar parser que preserva o raw body para validação HMAC.
  // Scoped a este plugin — não afeta os demais módulos.
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (req, body: Buffer, done) => {
      ;(req as FastifyRequest & { rawBody: Buffer }).rawBody = body
      try {
        done(null, JSON.parse(body.toString('utf8')))
      } catch (err) {
        done(err as Error, undefined)
      }
    },
  )

  // ------------------------------------------------------------------
  // GET /webhook/whatsapp — Meta challenge (verificação inicial)
  // ------------------------------------------------------------------
  app.get('/whatsapp', async (request, reply) => {
    const query = request.query as Record<string, string>
    const mode = query['hub.mode']
    const token = query['hub.verify_token']
    const challenge = query['hub.challenge']

    if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
      app.log.info('[WhatsApp] Webhook verificado pela Meta')
      return reply.code(200).send(challenge)
    }

    return reply.code(403).send({ error: 'Verify token inválido' })
  })

  // ------------------------------------------------------------------
  // POST /webhook/whatsapp — Recebimento de mensagens e status
  // ------------------------------------------------------------------
  app.post('/whatsapp', async (request, reply) => {
    const rawBody = (request as FastifyRequest & { rawBody?: Buffer }).rawBody
    const signature = request.headers['x-hub-signature-256'] as string | undefined

    if (!validateSignature(rawBody ?? Buffer.alloc(0), signature)) {
      app.log.warn('[WhatsApp] Assinatura inválida — rejeitando webhook')
      return reply.code(401).send({ error: 'Assinatura inválida' })
    }

    const payload = request.body as MetaWebhookPayload

    // Meta exige resposta 200 em até ~5s — processar de forma assíncrona
    reply.code(200).send({ status: 'ok' })

    // Processar após responder
    try {
      for (const entry of payload.entry ?? []) {
        for (const change of entry.changes ?? []) {
          if (change.field === 'messages') {
            await processChange(change.value)
          }
        }
      }
    } catch (err) {
      app.log.error({ err }, '[WhatsApp] Erro ao processar webhook')
    }
  })

  // ------------------------------------------------------------------
  // POST /webhook/whatsapp/mock — Simular mensagem recebida (apenas dev)
  // Permite testar o fluxo completo sem a Meta API real.
  // Requer WHATSAPP_MOCK=true no ambiente.
  // ------------------------------------------------------------------
  app.post<{
    Body: {
      phone_number_id: string
      from: string
      display_name?: string
      message_type?: 'text' | 'audio'
      text?: string
    }
  }>('/whatsapp/mock', async (request, reply) => {
    // Dupla proteção: WHATSAPP_MOCK=true E não pode ser production
    const isProduction = process.env.NODE_ENV === 'production'
    if (!MOCK || isProduction) {
      return reply.code(403).send({ error: 'Mock mode desabilitado. Defina WHATSAPP_MOCK=true e NODE_ENV!=production.' })
    }

    const { phone_number_id, from, display_name, message_type = 'text', text } = request.body

    if (!phone_number_id || !from) {
      return reply.code(400).send({ error: 'phone_number_id e from são obrigatórios' })
    }

    if (!text && message_type === 'text') {
      return reply.code(400).send({ error: 'Campo text é obrigatório para message_type=text' })
    }

    const waMessageId = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    const mockPayload: MetaWebhookPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'mock_entry',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: from,
                  phone_number_id,
                },
                contacts: [
                  {
                    profile: { name: display_name ?? from },
                    wa_id: from,
                  },
                ],
                messages: [
                  {
                    from,
                    id: waMessageId,
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                    type: message_type,
                    ...(message_type === 'text' ? { text: { body: text ?? '' } } : {}),
                  },
                ],
              },
            },
          ],
        },
      ],
    }

    reply.code(200).send({ status: 'ok', wa_message_id: waMessageId })

    // Processar de forma assíncrona (igual ao webhook real)
    try {
      for (const entry of mockPayload.entry ?? []) {
        for (const change of entry.changes ?? []) {
          if (change.field === 'messages') {
            await processChange(change.value)
          }
        }
      }
      app.log.info(`[WhatsApp Mock] Mensagem processada: from=${from} type=${message_type}`)
    } catch (err) {
      app.log.error({ err }, '[WhatsApp Mock] Erro ao processar mensagem simulada')
    }
  })
}
