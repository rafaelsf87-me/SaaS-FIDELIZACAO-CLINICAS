import OpenAI from 'openai'
import { createReadStream } from 'node:fs'
import { writeFile, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { downloadMedia } from '../whatsapp/whatsapp.media.js'

// ---------------------------------------------------------------------------
// Whisper — transcrição de áudio WhatsApp
// ---------------------------------------------------------------------------
// Fluxo:
//   1. Baixar bytes via downloadMedia (usa whatsapp.media.ts, suporta mock)
//   2. Salvar em arquivo temporário com extensão .ogg (formato WhatsApp)
//   3. Enviar para Whisper API
//   4. Deletar arquivo temporário
//   5. Retornar texto transcrito
// ---------------------------------------------------------------------------

let _openaiClient: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!_openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('OPENAI_API_KEY não configurada (necessária para Whisper)')
    _openaiClient = new OpenAI({ apiKey })
  }
  return _openaiClient
}

/**
 * Transcreve um áudio WhatsApp (identificado por media_id Meta).
 *
 * @param mediaId   ID da mídia na Meta (campo msg.audio.id)
 * @param waToken   Token de acesso da clínica (waba_access_token)
 * @returns         Texto transcrito, ou null se falhar silenciosamente
 */
export async function transcribeWhatsAppAudio(
  mediaId: string,
  waToken: string,
): Promise<string | null> {
  let tempPath: string | null = null

  try {
    // 1. Baixar buffer via utilitário existente
    const { buffer: audioBuffer } = await downloadMedia(mediaId, waToken)

    // Buffer vazio em modo mock — retorna placeholder para desenvolvimento
    if (audioBuffer.length === 0) {
      console.info('[Whisper] Modo mock: retornando transcrição placeholder')
      return '[Transcrição mock: áudio recebido]'
    }

    // 2. Salvar em arquivo temporário .ogg
    tempPath = join(
      tmpdir(),
      `wa-audio-${Date.now()}-${Math.random().toString(36).slice(2)}.ogg`,
    )
    await writeFile(tempPath, audioBuffer)

    // 3. Enviar para Whisper
    const client = getOpenAIClient()
    const transcription = await client.audio.transcriptions.create({
      file: createReadStream(tempPath),
      model: 'whisper-1',
      language: 'pt', // Português do Brasil
      response_format: 'text',
    })

    return typeof transcription === 'string' ? transcription.trim() : null
  } catch (err) {
    console.error('[Whisper] Erro na transcrição:', err)
    return null
  } finally {
    // 4. Limpar arquivo temporário
    if (tempPath) {
      unlink(tempPath).catch(() => {
        /* ignora erro de cleanup */
      })
    }
  }
}

/**
 * Calcula duração estimada em minutos a partir do tamanho do buffer.
 * Usado para metering (billing.audio_minutes_processed).
 * Estimativa conservadora: ~16KB/s para ogg/opus 128kbps.
 */
export function estimateAudioMinutes(bufferSizeBytes: number): number {
  const estimatedSeconds = bufferSizeBytes / 16_000
  return Math.max(0.1, Math.ceil((estimatedSeconds / 60) * 10) / 10)
}
