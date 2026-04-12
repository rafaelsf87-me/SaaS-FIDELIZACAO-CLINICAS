import { PageHeader } from '@/components/layouts/PageHeader'
import { PlaceholderPage } from '@/components/ui/PlaceholderPage'

export default function AdminScenariosPage() {
  return (
    <>
      <PageHeader title="Cenários FUP" breadcrumb={['Admin', 'Cenários FUP']} />
      <main className="flex-1 overflow-y-auto p-6">
        <PlaceholderPage title="Cenários de Follow-up" description="Configuração global dos cenários de acompanhamento pós-consulta por especialidade." />
      </main>
    </>
  )
}
