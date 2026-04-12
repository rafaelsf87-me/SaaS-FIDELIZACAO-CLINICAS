import { AdminLayout } from '@/components/layouts/AdminLayout'
import { PlaceholderPage } from '@/components/ui/PlaceholderPage'

export default function AdminKeywordsPage() {
  return (
    <AdminLayout title="Keywords" breadcrumb={['Admin', 'Keywords']}>
      <PlaceholderPage title="Keywords Globais" description="Palavras-chave globais para classificação de intenção nas conversas via WhatsApp." />
    </AdminLayout>
  )
}
