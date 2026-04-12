import { PageHeader } from '@/components/layouts/PageHeader'
import { PlaceholderPage } from '@/components/ui/PlaceholderPage'

export default function ClinicSettingsFollowupPage() {
  return (
    <>
      <PageHeader title="Follow-up" breadcrumb={['Clínica', 'Configurações', 'Follow-up']} />
      <main className="flex-1 overflow-y-auto p-6">
        <PlaceholderPage title="Configurações de Follow-up" description="Ativar/desativar follow-ups por inatividade e contextuais, configurar janelas de tempo e comportamentos." />
      </main>
    </>
  )
}
