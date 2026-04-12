import { PageHeader } from '@/components/layouts/PageHeader'
import { createClient } from '@/lib/supabase/server'
import { ClinicsClient } from './ClinicsClient'

export default async function AdminClinicsPage() {
  const supabase = await createClient()

  // Busca tenants server-side para SSR — erro silencioso mostra lista vazia
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name, description, phone_contact, status, created_at')
    .order('name')

  return (
    <>
      <PageHeader title="Clínicas" breadcrumb={['Admin', 'Clínicas']} />
      <main className="flex-1 overflow-y-auto p-6">
        <ClinicsClient initialTenants={tenants ?? []} />
      </main>
    </>
  )
}
