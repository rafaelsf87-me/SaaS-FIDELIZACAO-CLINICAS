import { PageHeader } from '@/components/layouts/PageHeader'
import { PlaceholderPage } from '@/components/ui/PlaceholderPage'

export default function AdminAuditPage() {
  return (
    <>
      <PageHeader title="Auditoria" breadcrumb={['Admin', 'Auditoria']} />
      <main className="flex-1 overflow-y-auto p-6">
        <PlaceholderPage title="Logs de Auditoria" description="Trilha completa de ações administrativas e eventos críticos do sistema." />
      </main>
    </>
  )
}
