import { PageHeader } from '@/components/layouts/PageHeader'
import { PlaceholderPage } from '@/components/ui/PlaceholderPage'

export default function ClinicSettingsSpecialtiesPage() {
  return (
    <>
      <PageHeader title="Especialidades/Serviços" breadcrumb={['Clínica', 'Configurações', 'Especialidades/Serviços']} />
      <main className="flex-1 overflow-y-auto p-6">
        <PlaceholderPage title="Especialidades e Serviços" description="Cadastro das especialidades médicas e procedimentos oferecidos pela clínica." />
      </main>
    </>
  )
}
