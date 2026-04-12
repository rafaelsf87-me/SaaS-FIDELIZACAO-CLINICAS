import { getSupabaseClient } from '../../infra/supabase.js'

// ---------------------------------------------------------------------------
// Rastreamento de uso de IA (usage_tracking)
// Atualiza contadores do mês corrente via upsert
// ---------------------------------------------------------------------------

interface AiUsageIncrement {
  ai_tokens_input?: number
  ai_tokens_output?: number
  audio_minutes_processed?: number
  documents_processed?: number
  messages_sent?: number
}

export async function trackAiUsage(
  tenantId: string,
  increment: AiUsageIncrement,
): Promise<void> {
  try {
    const supabase = getSupabaseClient()
    const monthYear = new Date().toISOString().slice(0, 7) // "2026-04"

    // Tenta buscar linha existente
    const { data: existing } = await supabase
      .from('usage_tracking')
      .select('id, ai_tokens_input, ai_tokens_output, audio_minutes_processed, documents_processed, messages_sent')
      .eq('tenant_id', tenantId)
      .eq('month_year', monthYear)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('usage_tracking')
        .update({
          ai_tokens_input:
            (existing.ai_tokens_input ?? 0) + (increment.ai_tokens_input ?? 0),
          ai_tokens_output:
            (existing.ai_tokens_output ?? 0) + (increment.ai_tokens_output ?? 0),
          audio_minutes_processed:
            (existing.audio_minutes_processed ?? 0) +
            (increment.audio_minutes_processed ?? 0),
          documents_processed:
            (existing.documents_processed ?? 0) + (increment.documents_processed ?? 0),
          messages_sent:
            (existing.messages_sent ?? 0) + (increment.messages_sent ?? 0),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
    } else {
      await supabase.from('usage_tracking').insert({
        tenant_id: tenantId,
        month_year: monthYear,
        messages_sent: increment.messages_sent ?? 0,
        messages_received: 0,
        ai_tokens_input: increment.ai_tokens_input ?? 0,
        ai_tokens_output: increment.ai_tokens_output ?? 0,
        audio_minutes_processed: increment.audio_minutes_processed ?? 0,
        documents_processed: increment.documents_processed ?? 0,
        campaigns_sent: 0,
        updated_at: new Date().toISOString(),
      })
    }
  } catch (err) {
    // Metering é não-bloqueante — logar e continuar
    console.error('[AI Usage] Erro ao rastrear uso:', err)
  }
}
