import { createHmac, timingSafeEqual } from 'node:crypto'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { getSupabaseClient } from '../../infra/supabase.js'
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
// -----------------------------------------------------------------------

async function findOrCreatePatient(
  tenantId: string,
  phone: string,
  displayName: string,
): Promise<string> {
  const supabase = getSupabaseClient()

  const { data: existing } = await supabase
    .from('patients')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('phone_whatsapp', phone)
    .maybeSingle()

  if (existing) return existing.id

  const { data: created, error } = await supabase
    .from('patients')
    .insert({
      tenant_id: tenantId,
      name: displayName || phone,
      first_name: displayName.split(' ')[0] ?? phone,
      phone_whatsapp: phone,
      status: 'active',
    })
    .select('id')
    .single()

  if (error) throw new Error(`Erro ao criar paciente: ${error.message}`)
  return created.id
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
// -----------------------------------------------------------------------

async function saveIncomingMessage(
  tenantId: string,
  conversationId: string,
  msg: MetaMessage,
): Promise<void> {
  const supabase = getSupabaseClient()

  let content = ''
  let messageType = msg.type as string
  let mediaUrl: string | null = null

  switch (msg.type) {
    case 'text':
      content = msg.text?.body ?? ''
      messageType = 'text'
      break
    case 'audio':
      content = '[Áudio]'
      messageType = 'audio'
      // media_url será preenchida após download/transcription na Etapa 9
      mediaUrl = null
      break
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
    media_url: mediaUrl,
    wa_message_id: msg.id,
    wa_status: null, // inbound: sem status de envio
    created_at: new Date(parseInt(msg.timestamp, 10) * 1000).toISOString(),
  })

  if (error) {
    // Ignora duplicatas (wa_message_id já salvo em retry do webhook)
    if (!error.message.includes('duplicate') && !error.code?.includes('23505')) {
      throw new Error(`Erro ao salvar mensagem: ${error.message}`)
    }
  }
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

    for (const msg of value.messages) {
      const displayName = contactMap.get(msg.from) ?? msg.from
      const patientId = await findOrCreatePatient(tenantId, msg.from, displayName)
      const conversationId = await findOrCreateConversation(tenantId, patientId)
      await saveIncomingMessage(tenantId, conversationId, msg)
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
}
