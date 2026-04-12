import { PageHeader } from '@/components/layouts/PageHeader'
import { PlaceholderPage } from '@/components/ui/PlaceholderPage'

export default function ClinicSettingsContactsPage() {
  return (
    <>
      <PageHeader title="Contatos" breadcrumb={['Clínica', 'Configurações', 'Contatos']} />
      <main className="flex-1 overflow-y-auto p-6">
        <PlaceholderPage title="Contatos da Clínica" description="Números de WhatsApp e contatos por especialidade para escalação de conversas." />
      </main>
    </>
  )
}
