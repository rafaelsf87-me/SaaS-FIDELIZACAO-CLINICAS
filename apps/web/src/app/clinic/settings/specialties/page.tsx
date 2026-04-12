import { ClinicLayout } from '@/components/layouts/ClinicLayout'
import { PlaceholderPage } from '@/components/ui/PlaceholderPage'

export default function ClinicSettingsSpecialtiesPage() {
  return (
    <ClinicLayout title="Especialidades/Serviços" breadcrumb={['Clínica', 'Configurações', 'Especialidades/Serviços']}>
      <PlaceholderPage title="Especialidades e Serviços" description="Cadastro das especialidades médicas e procedimentos oferecidos pela clínica." />
    </ClinicLayout>
  )
}
