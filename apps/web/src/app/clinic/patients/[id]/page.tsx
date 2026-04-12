import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/layouts/PageHeader'
import { createClient } from '@/lib/supabase/server'
import { PatientDetailClient } from './PatientDetailClient'
import type { Tables } from '@crm/database'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ClinicPatientDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single<{ tenant_id: string | null }>()

  if (!profile?.tenant_id) notFound()

  const { data: patient } = await supabase
    .from('patients')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)
    .single<Tables<'patients'>>()

  if (!patient) notFound()

  return (
    <>
      <PageHeader
        title={patient.name}
        breadcrumb={['Clínica', 'Pacientes', patient.first_name]}
      />
      <main className="flex-1 overflow-y-auto p-6">
        <PatientDetailClient patient={patient} />
      </main>
    </>
  )
}
