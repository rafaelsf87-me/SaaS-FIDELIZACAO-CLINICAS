import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/layouts/PageHeader'
import { createClient } from '@/lib/supabase/server'
import { PatientsClient } from './PatientsClient'
import type { Tables } from '@crm/database'

type PatientRow = Pick<
  Tables<'patients'>,
  | 'id'
  | 'cpf'
  | 'name'
  | 'first_name'
  | 'phone_whatsapp'
  | 'health_plan'
  | 'status'
  | 'recurrence_flag'
  | 'last_interaction_at'
  | 'created_at'
>

export default async function ClinicPatientsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single<{ tenant_id: string | null }>()

  if (!profile?.tenant_id) notFound()

  const { data: patients } = await supabase
    .from('patients')
    .select('id, cpf, name, first_name, phone_whatsapp, health_plan, status, recurrence_flag, last_interaction_at, created_at')
    .eq('tenant_id', profile.tenant_id)
    .eq('enabled', true)
    .order('name')
    .returns<PatientRow[]>()

  return (
    <>
      <PageHeader title="Pacientes" breadcrumb={['Clínica', 'Pacientes']} />
      <main className="flex-1 overflow-y-auto p-6">
        <PatientsClient initialPatients={patients ?? []} />
      </main>
    </>
  )
}
