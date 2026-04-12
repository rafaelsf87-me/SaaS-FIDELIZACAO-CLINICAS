import { PageHeader } from '@/components/layouts/PageHeader'
import { PlaceholderPage } from '@/components/ui/PlaceholderPage'

export default function ClinicSettingsKeywordsPage() {
  return (
    <>
      <PageHeader title="Keywords" breadcrumb={['Clínica', 'Configurações', 'Keywords']} />
      <main className="flex-1 overflow-y-auto p-6">
        <PlaceholderPage title="Keywords da Clínica" description="Palavras-chave personalizadas para identificar intenções específicas dos pacientes desta clínica." />
      </main>
    </>
  )
}
