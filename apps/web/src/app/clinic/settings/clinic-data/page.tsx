import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/layouts/PageHeader'
import { createClient } from '@/lib/supabase/server'
import { ClinicDataClient } from './ClinicDataClient'

export default async function ClinicSettingsClinicDataPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single<{ tenant_id: string | null }>()

  if (!profile?.tenant_id) notFound()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, description, services_description, phone_contact, waba_phone_number_id, waba_access_token, followup_inactivity_enabled, followup_contextual_enabled')
    .eq('id', profile.tenant_id)
    .single()

  if (!tenant) notFound()

  return (
    <>
      <PageHeader title="Dados da Clínica" breadcrumb={['Clínica', 'Configurações', 'Dados da Clínica']} />
      <main className="flex-1 overflow-y-auto p-6">
        <ClinicDataClient tenant={tenant} />
      </main>
    </>
  )
}
