import { PageHeader } from '@/components/layouts/PageHeader'
import { PlaceholderPage } from '@/components/ui/PlaceholderPage'

export default function ClinicPatientsPage() {
  return (
    <>
      <PageHeader title="Pacientes" breadcrumb={['Clínica', 'Pacientes']} />
      <main className="flex-1 overflow-y-auto p-6">
        <PlaceholderPage title="Pacientes" description="Cadastro e gestão de pacientes: dados pessoais, histórico de interações e status de follow-up." />
      </main>
    </>
  )
}
