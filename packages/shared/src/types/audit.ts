export type AuditActor = 'ai' | 'secretary' | 'system' | 'admin'

export interface AuditLog {
  id: string
  tenant_id: string | null
  patient_id: string | null
  action: string
  details: Record<string, unknown> | null
  actor: AuditActor
  created_at: string
}
