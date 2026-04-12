import { PageHeader } from '@/components/layouts/PageHeader'
import { PlaceholderPage } from '@/components/ui/PlaceholderPage'

export default function ClinicConversationsPage() {
  return (
    <>
      <PageHeader title="Conversas" breadcrumb={['Clínica', 'Conversas']} />
      <main className="flex-1 overflow-y-auto p-6">
        <PlaceholderPage title="Conversas" description="Histórico de conversas WhatsApp com pacientes, incluindo escalações e mensagens em aberto." />
      </main>
    </>
  )
}
