import { PageHeader } from '@/components/layouts/PageHeader'
import { PlaceholderPage } from '@/components/ui/PlaceholderPage'

export default function AdminClinicsPage() {
  return (
    <>
      <PageHeader title="Clínicas" breadcrumb={['Admin', 'Clínicas']} />
      <main className="flex-1 overflow-y-auto p-6">
        <PlaceholderPage title="Clínicas" description="Gestão de todos os tenants: cadastro, configuração, status e planos." />
      </main>
    </>
  )
}
