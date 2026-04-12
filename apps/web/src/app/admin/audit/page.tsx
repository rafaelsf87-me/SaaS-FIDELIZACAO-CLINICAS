import { AdminLayout } from '@/components/layouts/AdminLayout'
import { PlaceholderPage } from '@/components/ui/PlaceholderPage'

export default function AdminAuditPage() {
  return (
    <AdminLayout title="Auditoria" breadcrumb={['Admin', 'Auditoria']}>
      <PlaceholderPage title="Logs de Auditoria" description="Trilha completa de ações administrativas e eventos críticos do sistema." />
    </AdminLayout>
  )
}
