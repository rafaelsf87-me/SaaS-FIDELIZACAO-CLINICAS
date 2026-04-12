import { PageHeader } from '@/components/layouts/PageHeader'
import { PlaceholderPage } from '@/components/ui/PlaceholderPage'

export default function ClinicCampaignsPage() {
  return (
    <>
      <PageHeader title="Campanhas" breadcrumb={['Clínica', 'Campanhas']} />
      <main className="flex-1 overflow-y-auto p-6">
        <PlaceholderPage title="Campanhas" description="Envio em massa de mensagens segmentadas por especialidade, idade ou histórico de consultas. Em breve." />
      </main>
    </>
  )
}
