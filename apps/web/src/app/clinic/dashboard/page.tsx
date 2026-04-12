import { ClinicLayout } from '@/components/layouts/ClinicLayout'
import { PlaceholderPage } from '@/components/ui/PlaceholderPage'

export default function ClinicDashboardPage() {
  return (
    <ClinicLayout title="Dashboard" breadcrumb={['Clínica', 'Dashboard']}>
      <PlaceholderPage title="Dashboard da Clínica" description="Visão geral: pacientes ativos, follow-ups em andamento, conversas pendentes de escalação." />
    </ClinicLayout>
  )
}
