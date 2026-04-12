import { PageHeader } from '@/components/layouts/PageHeader'
import { PlaceholderPage } from '@/components/ui/PlaceholderPage'

export default function AdminDashboardPage() {
  return (
    <>
      <PageHeader title="Dashboard" breadcrumb={['Admin', 'Dashboard']} />
      <main className="flex-1 overflow-y-auto p-6">
        <PlaceholderPage title="Dashboard" description="Visão geral do sistema: clínicas ativas, uso de mensagens, métricas globais." />
      </main>
    </>
  )
}
