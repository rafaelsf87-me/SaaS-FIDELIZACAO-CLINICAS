import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/layouts/PageHeader'
import { createClient } from '@/lib/supabase/server'
import { Users, MessageSquare, CalendarClock, Star } from 'lucide-react'
import DashboardCharts, {
  type WeeklyInteraction,
  type FollowupRate,
  type KeywordCategory,
} from './DashboardCharts'

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
// Helpers — intervalos de semana
// -----------------------------------------------------------------------

function getWeekLabel(weeksAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - weeksAgo * 7)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${day}/${month}`
}

function weekStartISO(weeksAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - weeksAgo * 7)
  d.setUTCHours(0, 0, 0, 0) // UTC para alinhar com timestamps do banco
  return d.toISOString()
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

  // -----------------------------------------------------------------------
  // Cards — queries em paralelo
  // -----------------------------------------------------------------------
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

  // -----------------------------------------------------------------------
  // Gráfico 1 — Interações por semana (últimas 8 semanas)
  // -----------------------------------------------------------------------
  const weeklyData: WeeklyInteraction[] = []

  for (let i = 7; i >= 0; i--) {
    const from = weekStartISO(i + 1)
    const to   = weekStartISO(i)
    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', from)
      .lt('created_at', to)

    weeklyData.push({ week: getWeekLabel(i), mensagens: count ?? 0 })
  }

  // -----------------------------------------------------------------------
  // Gráfico 2 — Taxa de resposta FUPs
  // -----------------------------------------------------------------------
  const [
    { count: fupTotal },
    { count: fupResponded },
  ] = await Promise.all([
    supabase
      .from('patient_followup_agenda')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('status', ['sent', 'responded']),
    supabase
      .from('patient_followup_agenda')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'responded'),
  ])

  const followupRate: FollowupRate = {
    respondido: fupResponded ?? 0,
    naoRespondido: Math.max(0, (fupTotal ?? 0) - (fupResponded ?? 0)),
  }

  // -----------------------------------------------------------------------
  // Gráfico 3 — Sinais por categoria (keywords detectadas nas mensagens)
  // Aproximação: conta mensagens outbound por tipo de keyword ativa do tenant
  // -----------------------------------------------------------------------
  const categories = ['emergency', 'clinical', 'commercial', 'optout', 'operational'] as const

  const keywordCounts = await Promise.all(
    categories.map(async (cat) => {
      // Busca keywords ativas da categoria para este tenant (inclui globais)
      const { data: keywords } = await supabase
        .from('escalation_keywords')
        .select('keyword')
        .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
        .eq('category', cat)
        .eq('active', true)

      if (!keywords?.length) return { categoria: cat, total: 0 }

      interface KwRow { keyword: string }
      const kwRows = keywords as KwRow[]

      // Conta mensagens inbound que contenham a primeira keyword da categoria
      // Aproximação — dados reais virão do ai_intent_detected na Etapa 9
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('direction', 'inbound')
        .ilike('content', `%${kwRows[0]?.keyword ?? ''}%`)

      return { categoria: cat, total: count ?? 0 }
    })
  )

  const keywordData: KeywordCategory[] = keywordCounts

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
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

          {/* Gráficos */}
          <DashboardCharts
            weeklyData={weeklyData}
            followupRate={followupRate}
            keywordData={keywordData}
          />
        </div>
      </main>
    </>
  )
}
