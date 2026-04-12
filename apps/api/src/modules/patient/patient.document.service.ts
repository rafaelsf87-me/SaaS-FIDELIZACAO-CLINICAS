import { getSupabaseClient } from '../../infra/supabase.js'
import { runAgent1 } from '../ai-engine/agent1.service.js'
import { getOnboardingQueue } from '../followup/followup.queues.js'
import { logAudit } from '../audit/audit.service.js'

// =============================================================================
// Documentos do Paciente
// Upload → Supabase Storage → patient_documents → trigger Agent 1
// =============================================================================

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/webp',
])

const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

// ---------------------------------------------------------------------------
// Extrair texto de arquivo (PDF ou texto simples)
// ---------------------------------------------------------------------------

async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === 'text/plain') {
    return buffer.toString('utf8')
  }

  if (mimeType === 'application/pdf') {
    try {
      // pdf-parse publica ESM nativo — importar como namespace
      const pdfParseModule = await import('pdf-parse')
      // A função pode estar no namespace diretamente (ESM) ou em .default (CJS interop)
      type PdfFn = (buf: Buffer) => Promise<{ text: string }>
      const pdfParse: PdfFn =
        (pdfParseModule as unknown as { default: PdfFn }).default ?? (pdfParseModule as unknown as PdfFn)
      const result = await pdfParse(buffer)
      return result.text ?? ''
    } catch (err) {
      console.error('[DocumentService] Erro ao extrair texto do PDF:', err)
      return ''
    }
  }

  // Imagens: retornar string vazia — Agent 1 pode ser expandido para vision
  return ''
}

// ---------------------------------------------------------------------------
// Upload para Supabase Storage
// ---------------------------------------------------------------------------

async function uploadToStorage(
  tenantId: string,
  patientId: string,
  buffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<string> {
  const supabase = getSupabaseClient()

  // Sanitizar nome do arquivo
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200)
  const storagePath = `tenants/${tenantId}/patients/${patientId}/docs/${Date.now()}_${safeName}`

  const { error } = await supabase.storage
    .from('patient-documents')
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false,
    })

  if (error) throw new Error(`Erro no upload: ${error.message}`)

  const { data: publicData } = supabase.storage
    .from('patient-documents')
    .getPublicUrl(storagePath)

  return publicData.publicUrl
}

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

export async function listDocuments(tenantId: string, patientId: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('patient_documents')
    .select('id, file_name, file_type, file_url, is_active, extracted_data, uploaded_at')
    .eq('tenant_id', tenantId)
    .eq('patient_id', patientId)
    .order('uploaded_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

// ---------------------------------------------------------------------------
// Upload + Agent 1
// ---------------------------------------------------------------------------

export async function uploadDocument(
  tenantId: string,
  patientId: string,
  buffer: Buffer,
  fileName: string,
  mimeType: string,
) {
  // Validações
  if (!ALLOWED_TYPES.has(mimeType)) {
    throw new Error(`Tipo de arquivo não permitido: ${mimeType}. Use PDF, texto ou imagem.`)
  }
  if (buffer.length > MAX_SIZE_BYTES) {
    throw new Error('Arquivo muito grande. Máximo: 10 MB.')
  }

  const supabase = getSupabaseClient()

  // Verificar que paciente pertence ao tenant
  const { data: patient, error: patientErr } = await supabase
    .from('patients')
    .select('id, name')
    .eq('id', patientId)
    .eq('tenant_id', tenantId)
    .single()

  if (patientErr || !patient) throw new Error('Paciente não encontrado')

  // Upload para Storage
  const fileUrl = await uploadToStorage(tenantId, patientId, buffer, fileName, mimeType)

  // Criar registro no banco
  const { data: doc, error: insertErr } = await supabase
    .from('patient_documents')
    .insert({
      patient_id: patientId,
      tenant_id: tenantId,
      file_url: fileUrl,
      file_name: fileName,
      file_type: mimeType,
      is_active: true,
      uploaded_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (insertErr || !doc) throw new Error(`Erro ao criar registro do documento: ${insertErr?.message}`)

  // Disparar Agent 1 de forma assíncrona (não bloqueia resposta HTTP)
  const documentId = (doc as { id: string }).id
  const patientName = (patient as { name: string }).name

  extractText(buffer, mimeType)
    .then(async (text) => {
      if (!text || text.trim().length < 50) {
        console.info(`[DocumentService] Texto insuficiente para análise (${text.length} chars) — pulando Agent 1`)
        return
      }

      const agent1Output = await runAgent1({
        documentId,
        patientId,
        tenantId,
        documentText: text,
        patientName,
      })

      // Enviar resumo ao paciente via WhatsApp 30 min após processamento (se tiver telefone)
      if (agent1Output.summary) {
        const { data: patientData } = await supabase
          .from('patients')
          .select('phone_whatsapp, first_name')
          .eq('id', patientId)
          .eq('tenant_id', tenantId)
          .maybeSingle()

        if (patientData?.phone_whatsapp && process.env.REDIS_URL) {
          getOnboardingQueue()
            .add(
              'summary',
              {
                tenantId,
                patientId,
                patientPhone: patientData.phone_whatsapp as string,
                patientFirstName: (patientData.first_name as string | null) ?? patientData.phone_whatsapp as string,
                step: 'summary',
                summary: agent1Output.summary,
              },
              { delay: 30 * 60 * 1000 }, // 30 minutos
            )
            .catch((err) =>
              console.error('[DocumentService] Erro ao enfileirar summary onboarding:', err),
            )
        }
      }
    })
    .catch((err) => {
      console.error('[DocumentService] Erro no Agent 1 (assíncrono):', err)
      void logAudit({
        tenantId,
        patientId,
        action: 'ai_agent1_failed',
        details: {
          error: err instanceof Error ? err.message : String(err),
          document_id: documentId,
          file_name: fileName,
        },
        actor: 'ai',
      })
    })

  return doc
}

// ---------------------------------------------------------------------------
// Ativar / desativar documento
// ---------------------------------------------------------------------------

export async function toggleDocument(
  tenantId: string,
  patientId: string,
  documentId: string,
  isActive: boolean,
) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('patient_documents')
    .update({ is_active: isActive })
    .eq('id', documentId)
    .eq('patient_id', patientId)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}
