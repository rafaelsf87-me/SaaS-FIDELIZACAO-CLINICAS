import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/layouts/PageHeader'
import { createClient } from '@/lib/supabase/server'
import { Users, MessageSquare, CalendarClock, Star } from 'lucide-react'

// -----------------------------------------------------------------------
// Stat card
// -----------------------------------------------------------------------

interface StatCardProps {
  label: string
  value: number | string
  icon: React.ReactNode
  description?: string
  highlight?: boolean
}

function StatCard({ label, value, icon, description, highlight }: StatCardProps) {
  return (
    <div
      className={`rounded-xl border p-5 flex flex-col gap-3 bg-background ${
        highlight ? 'border-amber-300 bg-amber-50' : 'border-border'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-sm font-medium ${highlight ? 'text-amber-800' : 'text-text-secondary'}`}>
          {label}
        </span>
        <div className={`rounded-lg p-2 ${highlight ? 'bg-amber-100 text-amber-700' : 'bg-surface text-text-secondary'}`}>
          {icon}
        </div>
      </div>
      <div className={`text-3xl font-bold ${highlight ? 'text-amber-900' : 'text-text-primary'}`}>
        {value}
      </div>
      {description && (
        <p className="text-xs text-text-secondary">{description}</p>
      )}
    </div>
  )
}

// -----------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------

export default async function ClinicDashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single<{ tenant_id: string | null }>()

  if (!profile?.tenant_id) notFound()

  const tenantId = profile.tenant_id

  // Queries em paralelo
  const [
    { count: activePatients },
    { count: opportunities },
    { count: escalatedConversations },
    { count: pendingFollowups },
  ] = await Promise.all([
    supabase
      .from('patients')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('enabled', true)
      .eq('status', 'active'),
    supabase
      .from('patients')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('enabled', true)
      .eq('opportunity_flag', true),
    supabase
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'escalated'),
    supabase
      .from('patient_followup_agenda')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'pending'),
  ])

  return (
    <>
      <PageHeader title="Dashboard" breadcrumb={['Clínica', 'Dashboard']} />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl flex flex-col gap-6">
          {/* Cards de métricas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Pacientes ativos"
              value={activePatients ?? 0}
              icon={<Users className="h-5 w-5" />}
              description="Com status ativo e habilitados"
            />
            <StatCard
              label="Oportunidades ativas"
              value={opportunities ?? 0}
              icon={<Star className="h-5 w-5" />}
              description="Pacientes com oportunidade detectada"
              highlight={(opportunities ?? 0) > 0}
            />
            <StatCard
              label="Conversas escaladas"
              value={escalatedConversations ?? 0}
              icon={<MessageSquare className="h-5 w-5" />}
              description="Aguardando intervenção humana"
            />
            <StatCard
              label="FUPs pendentes"
              value={pendingFollowups ?? 0}
              icon={<CalendarClock className="h-5 w-5" />}
              description="Follow-ups agendados não enviados"
            />
          </div>

          {/* Placeholder gráficos — Etapa 7 */}
          <div className="rounded-xl border border-border bg-surface p-6 flex flex-col items-center gap-3 text-center">
            <p className="font-medium text-text-primary">Gráficos de desempenho</p>
            <p className="text-sm text-text-secondary max-w-md">
              Interações por semana, taxa de resposta dos follow-ups e sinais detectados por categoria
              serão exibidos aqui.
            </p>
            <p className="text-xs text-text-secondary opacity-60">
              Disponível na Etapa 7 — Dashboards com Recharts.
            </p>
          </div>
        </div>
      </main>
    </>
  )
}
