import { ClinicLayout } from '@/components/layouts/ClinicLayout'
import { PlaceholderPage } from '@/components/ui/PlaceholderPage'

export default function ClinicConversationsPage() {
  return (
    <ClinicLayout title="Conversas" breadcrumb={['Clínica', 'Conversas']}>
      <PlaceholderPage title="Conversas" description="Histórico de conversas WhatsApp com pacientes, incluindo escalações e mensagens em aberto." />
    </ClinicLayout>
  )
}
