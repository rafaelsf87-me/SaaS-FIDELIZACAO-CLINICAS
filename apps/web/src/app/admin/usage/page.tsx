import { PageHeader } from '@/components/layouts/PageHeader'
import { PlaceholderPage } from '@/components/ui/PlaceholderPage'

export default function AdminUsagePage() {
  return (
    <>
      <PageHeader title="Usage" breadcrumb={['Admin', 'Usage']} />
      <main className="flex-1 overflow-y-auto p-6">
        <PlaceholderPage title="Uso do Sistema" description="Relatórios de consumo por tenant: mensagens enviadas, tokens LLM, chamadas API." />
      </main>
    </>
  )
}
