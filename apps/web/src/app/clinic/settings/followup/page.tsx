import { ClinicLayout } from '@/components/layouts/ClinicLayout'
import { PlaceholderPage } from '@/components/ui/PlaceholderPage'

export default function ClinicSettingsFollowupPage() {
  return (
    <ClinicLayout title="Follow-up" breadcrumb={['Clínica', 'Configurações', 'Follow-up']}>
      <PlaceholderPage title="Configurações de Follow-up" description="Ativar/desativar follow-ups por inatividade e contextuais, configurar janelas de tempo e comportamentos." />
    </ClinicLayout>
  )
}
