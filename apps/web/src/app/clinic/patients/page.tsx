import { ClinicLayout } from '@/components/layouts/ClinicLayout'
import { PlaceholderPage } from '@/components/ui/PlaceholderPage'

export default function ClinicPatientsPage() {
  return (
    <ClinicLayout title="Pacientes" breadcrumb={['Clínica', 'Pacientes']}>
      <PlaceholderPage title="Pacientes" description="Cadastro e gestão de pacientes: dados pessoais, histórico de interações e status de follow-up." />
    </ClinicLayout>
  )
}
