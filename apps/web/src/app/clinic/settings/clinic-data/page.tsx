import { PageHeader } from '@/components/layouts/PageHeader'
import { PlaceholderPage } from '@/components/ui/PlaceholderPage'

export default function ClinicSettingsClinicDataPage() {
  return (
    <>
      <PageHeader title="Dados da Clínica" breadcrumb={['Clínica', 'Configurações', 'Dados da Clínica']} />
      <main className="flex-1 overflow-y-auto p-6">
        <PlaceholderPage title="Dados da Clínica" description="Nome, logo, descrição, horários de funcionamento e informações gerais da clínica." />
      </main>
    </>
  )
}
