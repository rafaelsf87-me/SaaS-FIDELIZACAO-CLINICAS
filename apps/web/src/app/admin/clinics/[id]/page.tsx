import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/layouts/PageHeader'
import { createClient } from '@/lib/supabase/server'
import { ClinicEditClient } from './ClinicEditClient'
import type { Tables } from '@crm/database'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminClinicEditPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: tenant }, { data: contacts }, { data: specialties }] = await Promise.all([
    supabase.from('tenants').select('*').eq('id', id).single<Tables<'tenants'>>(),
    supabase.from('tenant_contacts').select('*').eq('tenant_id', id).order('is_default', { ascending: false }).returns<Tables<'tenant_contacts'>[]>(),
    supabase.from('tenant_specialties').select('*').eq('tenant_id', id).order('name').returns<Tables<'tenant_specialties'>[]>(),
  ])

  if (!tenant) notFound()

  return (
    <>
      <PageHeader title={tenant.name} breadcrumb={['Admin', 'Clínicas', tenant.name]} />
      <main className="flex-1 overflow-y-auto p-6">
        <ClinicEditClient
          tenant={tenant}
          initialContacts={contacts ?? []}
          initialSpecialties={specialties ?? []}
        />
      </main>
    </>
  )
}
