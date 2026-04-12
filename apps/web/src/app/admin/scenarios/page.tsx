import { AdminLayout } from '@/components/layouts/AdminLayout'
import { PlaceholderPage } from '@/components/ui/PlaceholderPage'

export default function AdminScenariosPage() {
  return (
    <AdminLayout title="Cenários FUP" breadcrumb={['Admin', 'Cenários FUP']}>
      <PlaceholderPage title="Cenários de Follow-up" description="Configuração global dos cenários de acompanhamento pós-consulta por especialidade." />
    </AdminLayout>
  )
}
