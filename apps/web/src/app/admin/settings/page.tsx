import { PageHeader } from '@/components/layouts/PageHeader'
import { PlaceholderPage } from '@/components/ui/PlaceholderPage'

export default function AdminSettingsPage() {
  return (
    <>
      <PageHeader title="Configurações" breadcrumb={['Admin', 'Configurações']} />
      <main className="flex-1 overflow-y-auto p-6">
        <PlaceholderPage title="Configurações do Sistema" description="Configurações globais: integrações, limites, provedores LLM e parâmetros gerais." />
      </main>
    </>
  )
}
