import { AdminLayout } from '@/components/layouts/AdminLayout'
import { PlaceholderPage } from '@/components/ui/PlaceholderPage'

export default function AdminDashboardPage() {
  return (
    <AdminLayout title="Dashboard" breadcrumb={['Admin', 'Dashboard']}>
      <PlaceholderPage title="Dashboard" description="Visão geral do sistema: clínicas ativas, uso de mensagens, métricas globais." />
    </AdminLayout>
  )
}
