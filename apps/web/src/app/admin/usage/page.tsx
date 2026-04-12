import { PageHeader } from '@/components/layouts/PageHeader'
import { createClient } from '@/lib/supabase/server'
import UsageClient, { type UsageRow, type MonthOption } from './UsageClient'

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

function getMonthYear(monthsAgo: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - monthsAgo)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function monthYearToLabel(my: string): string {
  const [y, m] = my.split('-')
  const d = new Date(Number(y), Number(m) - 1, 1)
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

// -----------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------

export default async function AdminUsagePage() {
  const supabase = await createClient()

  // Gera os últimos 12 meses como opções de filtro
  const allMonths: MonthOption[] = Array.from({ length: 12 }, (_, i) => {
    const my = getMonthYear(i)
    return { value: my, label: monthYearToLabel(my) }
  })

  // Busca dados de todos os meses com join na tabela tenants
  const { data: rawRows } = await supabase
    .from('usage_tracking')
    .select(`
      tenant_id,
      month_year,
      messages_sent,
      messages_received,
      ai_tokens_input,
      ai_tokens_output,
      audio_minutes_processed,
      documents_processed,
      tenants(name)
    `)
    .in('month_year', allMonths.map((m) => m.value))
    .order('messages_sent', { ascending: false })

  interface RawUsageRow {
    tenant_id: string
    month_year: string
    messages_sent: number
    messages_received: number
    ai_tokens_input: number
    ai_tokens_output: number
    audio_minutes_processed: number
    documents_processed: number
    tenants: { name: string } | null
  }

  const rows = (rawRows ?? []) as RawUsageRow[]

  // Agrupa por mês
  const dataByMonth: Record<string, UsageRow[]> = {}
  for (const row of rows) {
    if (!dataByMonth[row.month_year]) dataByMonth[row.month_year] = []
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    dataByMonth[row.month_year]!.push({
      tenant_id: row.tenant_id,
      clinicName: row.tenants?.name ?? '—',
      messages_sent: row.messages_sent,
      messages_received: row.messages_received,
      ai_tokens_input: row.ai_tokens_input,
      ai_tokens_output: row.ai_tokens_output,
      audio_minutes_processed: row.audio_minutes_processed,
      documents_processed: row.documents_processed,
    })
  }

  return (
    <>
      <PageHeader title="Usage" breadcrumb={['Admin', 'Usage']} />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl">
          <UsageClient allMonths={allMonths} dataByMonth={dataByMonth} />
        </div>
      </main>
    </>
  )
}
