import { PageHeader } from '@/components/layouts/PageHeader'
import { createClient } from '@/lib/supabase/server'
import { Building2, Users, MessageSquare, Cpu } from 'lucide-react'
import AdminUsageChart, { type MonthlyUsage } from './AdminDashboardCharts'

// -----------------------------------------------------------------------
// Stat card
// -----------------------------------------------------------------------

interface StatCardProps {
  label: string
  value: number | string
  icon: React.ReactNode
  description?: string
}

function StatCard({ label, value, icon, description }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-background p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-secondary">{label}</span>
        <div className="rounded-lg p-2 bg-surface text-text-secondary">{icon}</div>
      </div>
      <div className="text-3xl font-bold text-text-primary">{value}</div>
      {description && <p className="text-xs text-text-secondary">{description}</p>}
    </div>
  )
}

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

function getMonthLabel(monthsAgo: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - monthsAgo)
  return d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
}

function getMonthYear(monthsAgo: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - monthsAgo)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

// -----------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  // -----------------------------------------------------------------------
  // Cards — queries em paralelo
  // -----------------------------------------------------------------------
  const currentMonthYear = getMonthYear(0)

  const [
    { count: activeClinics },
    { count: totalPatients },
    { data: currentMonthUsage },
  ] = await Promise.all([
    supabase
      .from('tenants')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase
      .from('patients')
      .select('id', { count: 'exact', head: true })
      .eq('enabled', true),
    supabase
      .from('usage_tracking')
      .select('messages_sent, ai_tokens_input, ai_tokens_output')
      .eq('month_year', currentMonthYear),
  ])

  interface UsageMonth {
    messages_sent: number
    ai_tokens_input: number
    ai_tokens_output: number
  }
  const usageRows = (currentMonthUsage ?? []) as UsageMonth[]
  const msgsMes = usageRows.reduce((s, r) => s + (r.messages_sent ?? 0), 0)
  const tokensMes = usageRows.reduce(
    (s, r) => s + (r.ai_tokens_input ?? 0) + (r.ai_tokens_output ?? 0),
    0
  )

  // -----------------------------------------------------------------------
  // Tabela Top 10 — clínicas por msgs no mês atual
  // -----------------------------------------------------------------------
  const { data: top10Raw } = await supabase
    .from('usage_tracking')
    .select('tenant_id, messages_sent, tenants(name)')
    .eq('month_year', currentMonthYear)
    .order('messages_sent', { ascending: false })
    .limit(10)

  interface Top10Row {
    tenant_id: string
    messages_sent: number
    tenants: { name: string } | null
  }
  const top10: Top10Row[] = (top10Raw ?? []) as Top10Row[]

  // -----------------------------------------------------------------------
  // Gráfico — uso agregado últimos 6 meses
  // -----------------------------------------------------------------------
  const monthlyData: MonthlyUsage[] = []
  for (let i = 5; i >= 0; i--) {
    const my = getMonthYear(i)
    const { data: rows } = await supabase
      .from('usage_tracking')
      .select('messages_sent')
      .eq('month_year', my)

    const total = (rows ?? []).reduce((s, r) => s + ((r as { messages_sent: number }).messages_sent ?? 0), 0)
    monthlyData.push({ month: getMonthLabel(i), mensagens: total })
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <>
      <PageHeader title="Dashboard" breadcrumb={['Admin', 'Dashboard']} />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl flex flex-col gap-6">
          {/* Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Clínicas ativas"
              value={activeClinics ?? 0}
              icon={<Building2 className="h-5 w-5" />}
              description="Com status ativo"
            />
            <StatCard
              label="Total de pacientes"
              value={totalPatients ?? 0}
              icon={<Users className="h-5 w-5" />}
              description="Habilitados em todos os tenants"
            />
            <StatCard
              label="Msgs este mês"
              value={msgsMes.toLocaleString('pt-BR')}
              icon={<MessageSquare className="h-5 w-5" />}
              description="Enviadas em todos os tenants"
            />
            <StatCard
              label="Tokens gastos"
              value={tokensMes.toLocaleString('pt-BR')}
              icon={<Cpu className="h-5 w-5" />}
              description="Input + output LLM este mês"
            />
          </div>

          {/* Gráfico — linha */}
          <div className="rounded-xl border border-border bg-background p-5">
            <p className="mb-4 text-sm font-semibold text-text-primary">
              Uso agregado — últimos 6 meses
            </p>
            <AdminUsageChart data={monthlyData} />
          </div>

          {/* Tabela Top 10 */}
          <div className="rounded-xl border border-border bg-background overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <p className="text-sm font-semibold text-text-primary">
                Top 10 clínicas por uso — {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </p>
            </div>
            {top10.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-text-secondary">
                Nenhum dado de uso registrado para este mês.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface text-text-secondary text-left">
                    <th className="px-5 py-3 font-medium">#</th>
                    <th className="px-5 py-3 font-medium">Clínica</th>
                    <th className="px-5 py-3 font-medium text-right">Msgs enviadas</th>
                  </tr>
                </thead>
                <tbody>
                  {top10.map((row, i) => (
                    <tr
                      key={row.tenant_id}
                      className={`border-t border-border ${i % 2 === 1 ? 'bg-surface/40' : ''}`}
                    >
                      <td className="px-5 py-3 text-text-secondary">{i + 1}</td>
                      <td className="px-5 py-3 text-text-primary font-medium">
                        {row.tenants?.name ?? '—'}
                      </td>
                      <td className="px-5 py-3 text-right text-text-primary tabular-nums">
                        {row.messages_sent.toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
