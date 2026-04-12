import { getSupabaseClient } from '../../infra/supabase.js'

// ---------------------------------------------------------------------------
// Serviço de Auditoria
// Persiste eventos críticos na tabela audit_logs.
// Falha silenciosamente para não bloquear o fluxo principal.
// ---------------------------------------------------------------------------

export type AuditActor = 'ai' | 'secretary' | 'system'

export interface LogAuditInput {
  tenantId: string | null
  patientId?: string | null
  action: string
  details?: Record<string, unknown>
  actor?: AuditActor
}

export async function logAudit(input: LogAuditInput): Promise<void> {
  try {
    const supabase = getSupabaseClient()
    await supabase.from('audit_logs').insert({
      tenant_id: input.tenantId,
      patient_id: input.patientId ?? null,
      action: input.action,
      details: input.details ?? {},
      actor: input.actor ?? 'system',
      created_at: new Date().toISOString(),
    })
  } catch (err) {
    // Auditoria é não-bloqueante
    console.error('[Audit] Erro ao gravar log:', err)
  }
}

// ---------------------------------------------------------------------------
// Wrapper para logar falhas críticas em chamadas externas
// Uso: await withAuditOnError('ai_agent2_failed', tenantId, () => runAgent2(...))
// ---------------------------------------------------------------------------

export async function withAuditOnError<T>(
  action: string,
  tenantId: string | null,
  fn: () => Promise<T>,
  extra?: Omit<LogAuditInput, 'tenantId' | 'action'>,
): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    await logAudit({
      tenantId,
      action,
      details: {
        error: err instanceof Error ? err.message : String(err),
        ...(extra?.details ?? {}),
      },
      actor: extra?.actor ?? 'system',
      ...(extra?.patientId !== undefined ? { patientId: extra.patientId } : {}),
    })
    throw err
  }
}
