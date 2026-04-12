import { ClinicLayout } from '@/components/layouts/ClinicLayout'
import { PlaceholderPage } from '@/components/ui/PlaceholderPage'

export default function ClinicCampaignsPage() {
  return (
    <ClinicLayout title="Campanhas" breadcrumb={['Clínica', 'Campanhas']}>
      <PlaceholderPage title="Campanhas" description="Envio em massa de mensagens segmentadas por especialidade, idade ou histórico de consultas. Em breve." />
    </ClinicLayout>
  )
}
