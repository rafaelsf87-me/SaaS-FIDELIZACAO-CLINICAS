import { ClinicLayout } from '@/components/layouts/ClinicLayout'
import { PlaceholderPage } from '@/components/ui/PlaceholderPage'

export default function ClinicSettingsContactsPage() {
  return (
    <ClinicLayout title="Contatos" breadcrumb={['Clínica', 'Configurações', 'Contatos']}>
      <PlaceholderPage title="Contatos da Clínica" description="Números de WhatsApp e contatos por especialidade para escalação de conversas." />
    </ClinicLayout>
  )
}
