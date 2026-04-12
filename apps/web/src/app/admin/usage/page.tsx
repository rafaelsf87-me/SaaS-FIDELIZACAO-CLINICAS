import { AdminLayout } from '@/components/layouts/AdminLayout'
import { PlaceholderPage } from '@/components/ui/PlaceholderPage'

export default function AdminUsagePage() {
  return (
    <AdminLayout title="Usage" breadcrumb={['Admin', 'Usage']}>
      <PlaceholderPage title="Uso do Sistema" description="Relatórios de consumo por tenant: mensagens enviadas, tokens LLM, chamadas API." />
    </AdminLayout>
  )
}
