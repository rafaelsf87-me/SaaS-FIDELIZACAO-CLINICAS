import { ClinicLayout } from '@/components/layouts/ClinicLayout'
import { PlaceholderPage } from '@/components/ui/PlaceholderPage'

export default function ClinicSettingsClinicDataPage() {
  return (
    <ClinicLayout title="Dados da Clínica" breadcrumb={['Clínica', 'Configurações', 'Dados da Clínica']}>
      <PlaceholderPage title="Dados da Clínica" description="Nome, logo, descrição, horários de funcionamento e informações gerais da clínica." />
    </ClinicLayout>
  )
}
