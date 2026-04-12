import { ClinicLayout } from '@/components/layouts/ClinicLayout'
import { PlaceholderPage } from '@/components/ui/PlaceholderPage'

export default function ClinicSettingsKeywordsPage() {
  return (
    <ClinicLayout title="Keywords" breadcrumb={['Clínica', 'Configurações', 'Keywords']}>
      <PlaceholderPage title="Keywords da Clínica" description="Palavras-chave personalizadas para identificar intenções específicas dos pacientes desta clínica." />
    </ClinicLayout>
  )
}
