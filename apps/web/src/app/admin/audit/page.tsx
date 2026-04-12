import { PageHeader } from '@/components/layouts/PageHeader'
import { createClient } from '@/lib/supabase/server'
import AuditClient, { type AuditLogRow, type ClinicOption } from './AuditClient'

// -----------------------------------------------------------------------
// Page — busca logs e clínicas, delega filtros ao client component
// -----------------------------------------------------------------------

export default async function AdminAuditPage() {
  const supabase = await createClient()

  // Últimos 1000 logs (limite razoável para client-side paginação/filtros)
  const { data: rawLogs } = await supabase
    .from('audit_logs')
    .select(`
      id,
      created_at,
      tenant_id,
      patient_id,
      action,
      actor,
      details,
      tenants(name),
      patients(name)
    `)
    .order('created_at', { ascending: false })
    .limit(1000)

  interface RawLog {
    id: string
    created_at: string
    tenant_id: string | null
    patient_id: string | null
    action: string
    actor: string
    details: Record<string, unknown> | null
    tenants: { name: string } | null
    patients: { name: string } | null
  }

  const logs: AuditLogRow[] = ((rawLogs ?? []) as RawLog[]).map((l) => ({
    id: l.id,
    created_at: l.created_at,
    tenant_id: l.tenant_id,
    patient_id: l.patient_id,
    action: l.action,
    actor: l.actor,
    details: l.details,
    clinicName: l.tenants?.name,
    patientName: l.patients?.name,
  }))

  // Lista de clínicas para o filtro
  const { data: tenantsRaw } = await supabase
    .from('tenants')
    .select('id, name')
    .order('name')

  const clinics: ClinicOption[] = (tenantsRaw ?? []) as ClinicOption[]

  return (
    <>
      <PageHeader title="Auditoria" breadcrumb={['Admin', 'Auditoria']} />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl">
          <AuditClient logs={logs} clinics={clinics} />
        </div>
      </main>
    </>
  )
}
