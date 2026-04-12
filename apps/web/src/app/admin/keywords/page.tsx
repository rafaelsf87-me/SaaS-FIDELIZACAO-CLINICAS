import { PageHeader } from '@/components/layouts/PageHeader'
import { PlaceholderPage } from '@/components/ui/PlaceholderPage'

export default function AdminKeywordsPage() {
  return (
    <>
      <PageHeader title="Keywords" breadcrumb={['Admin', 'Keywords']} />
      <main className="flex-1 overflow-y-auto p-6">
        <PlaceholderPage title="Keywords Globais" description="Palavras-chave globais para classificação de intenção nas conversas via WhatsApp." />
      </main>
    </>
  )
}
