import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/layouts/PageHeader'
import { createClient } from '@/lib/supabase/server'
import { SpecialtiesClient } from './SpecialtiesClient'
import type { Tables } from '@crm/database'

type SpecialtyRow = Pick<Tables<'tenant_specialties'>, 'id' | 'name' | 'type' | 'contact_id' | 'active'>
type ContactRow = Pick<Tables<'tenant_contacts'>, 'id' | 'label'>

export default async function ClinicSettingsSpecialtiesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single<{ tenant_id: string | null }>()

  if (!profile?.tenant_id) notFound()

  const [{ data: specialties }, { data: contacts }] = await Promise.all([
    supabase
      .from('tenant_specialties')
      .select('id, name, type, contact_id, active')
      .eq('tenant_id', profile.tenant_id)
      .order('name')
      .returns<SpecialtyRow[]>(),
    supabase
      .from('tenant_contacts')
      .select('id, label')
      .eq('tenant_id', profile.tenant_id)
      .eq('active', true)
      .order('label')
      .returns<ContactRow[]>(),
  ])

  return (
    <>
      <PageHeader title="Especialidades" breadcrumb={['Clínica', 'Configurações', 'Especialidades']} />
      <main className="flex-1 overflow-y-auto p-6">
        <SpecialtiesClient
          initialSpecialties={specialties ?? []}
          contacts={contacts ?? []}
        />
      </main>
    </>
  )
}
