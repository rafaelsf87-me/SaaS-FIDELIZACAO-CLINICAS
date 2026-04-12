import { AdminLayout } from '@/components/layouts/AdminLayout'
import { PlaceholderPage } from '@/components/ui/PlaceholderPage'

export default function AdminSettingsPage() {
  return (
    <AdminLayout title="Configurações" breadcrumb={['Admin', 'Configurações']}>
      <PlaceholderPage title="Configurações do Sistema" description="Configurações globais: integrações, limites, provedores LLM e parâmetros gerais." />
    </AdminLayout>
  )
}
