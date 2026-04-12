import { AdminLayout } from '@/components/layouts/AdminLayout'
import { PlaceholderPage } from '@/components/ui/PlaceholderPage'

export default function AdminClinicsPage() {
  return (
    <AdminLayout title="Clínicas" breadcrumb={['Admin', 'Clínicas']}>
      <PlaceholderPage title="Clínicas" description="Gestão de todos os tenants: cadastro, configuração, status e planos." />
    </AdminLayout>
  )
}
