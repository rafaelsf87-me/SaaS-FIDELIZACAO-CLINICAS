import { PageHeader } from '@/components/layouts/PageHeader'
import { PlaceholderPage } from '@/components/ui/PlaceholderPage'

export default function ClinicDashboardPage() {
  return (
    <>
      <PageHeader title="Dashboard" breadcrumb={['Clínica', 'Dashboard']} />
      <main className="flex-1 overflow-y-auto p-6">
        <PlaceholderPage title="Dashboard da Clínica" description="Visão geral: pacientes ativos, follow-ups em andamento, conversas pendentes de escalação." />
      </main>
    </>
  )
}
