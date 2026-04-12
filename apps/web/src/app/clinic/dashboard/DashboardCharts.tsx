'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

export interface WeeklyInteraction {
  week: string
  mensagens: number
}

export interface FollowupRate {
  respondido: number
  naoRespondido: number
}

export interface KeywordCategory {
  categoria: string
  total: number
}

interface Props {
  weeklyData: WeeklyInteraction[]
  followupRate: FollowupRate
  keywordData: KeywordCategory[]
}

// -----------------------------------------------------------------------
// Empty state
// -----------------------------------------------------------------------

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-48 items-center justify-center text-sm text-text-secondary">
      {message}
    </div>
  )
}

// -----------------------------------------------------------------------
// Gráfico 1 — Interações por semana (bar chart)
// -----------------------------------------------------------------------

function WeeklyChart({ data }: { data: WeeklyInteraction[] }) {
  const hasData = data.some((d) => d.mensagens > 0)

  return (
    <div className="rounded-xl border border-border bg-background p-5">
      <p className="mb-4 text-sm font-semibold text-text-primary">
        Interações por semana
      </p>
      {!hasData ? (
        <EmptyChart message="Nenhuma interação registrada nas últimas 8 semanas." />
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={TOKEN.border} />
            <XAxis dataKey="week" tick={{ fontSize: 11, fill: TOKEN.textSecondary }} />
            <YAxis tick={{ fontSize: 11, fill: TOKEN.textSecondary }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: TOKEN.bgWhite,
                border: `1px solid ${TOKEN.border}`,
                borderRadius: '8px',
                fontSize: 12,
              }}
            />
            <Bar dataKey="mensagens" fill={TOKEN.primary} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

// -----------------------------------------------------------------------
// Design tokens — mirrors tailwind.config.ts (keep in sync)
// -----------------------------------------------------------------------

const TOKEN = {
  primary:       '#2563EB',
  primaryLighter:'#DBEAFE',
  border:        '#E2E8F0',
  textSecondary: '#64748B',
  primaryLight:  '#60A5FA',
  bgWhite:       '#FFFFFF',
} as const

// -----------------------------------------------------------------------
// Gráfico 2 — Taxa de resposta FUPs (donut chart)
// -----------------------------------------------------------------------

const DONUT_COLORS = [TOKEN.primary, TOKEN.primaryLighter]

function FollowupDonut({ data }: { data: FollowupRate }) {
  const total = data.respondido + data.naoRespondido
  const hasData = total > 0

  const chartData = [
    { name: 'Respondido', value: data.respondido },
    { name: 'Não respondido', value: data.naoRespondido },
  ]

  const pct = hasData ? Math.round((data.respondido / total) * 100) : 0

  return (
    <div className="rounded-xl border border-border bg-background p-5">
      <p className="mb-4 text-sm font-semibold text-text-primary">
        Taxa de resposta (FUPs)
      </p>
      {!hasData ? (
        <EmptyChart message="Nenhum follow-up enviado ainda." />
      ) : (
        <div className="flex items-center gap-6">
          <div className="w-40 shrink-0">
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={72}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-3xl font-bold text-text-primary">{pct}%</p>
              <p className="text-xs text-text-secondary">taxa de resposta</p>
            </div>
            <div className="flex flex-col gap-1 text-xs">
              <span className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-primary" />
                <span className="text-text-secondary">
                  Respondido: <strong className="text-text-primary">{data.respondido}</strong>
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-primary-lighter" />
                <span className="text-text-secondary">
                  Não respondido: <strong className="text-text-primary">{data.naoRespondido}</strong>
                </span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// -----------------------------------------------------------------------
// Gráfico 3 — Sinais por categoria (horizontal bar chart)
// -----------------------------------------------------------------------

const CATEGORY_LABELS: Record<string, string> = {
  emergency: 'Emergência',
  clinical: 'Clínico',
  commercial: 'Comercial',
  optout: 'Opt-out',
  operational: 'Operacional',
}

function KeywordCategoryChart({ data }: { data: KeywordCategory[] }) {
  const hasData = data.some((d) => d.total > 0)
  const formatted = data.map((d) => ({
    ...d,
    label: CATEGORY_LABELS[d.categoria] ?? d.categoria,
  }))

  return (
    <div className="rounded-xl border border-border bg-background p-5">
      <p className="mb-4 text-sm font-semibold text-text-primary">
        Sinais detectados por categoria
      </p>
      {!hasData ? (
        <EmptyChart message="Nenhum sinal detectado no período." />
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            layout="vertical"
            data={formatted}
            margin={{ top: 4, right: 24, left: 8, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={TOKEN.border} horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: TOKEN.textSecondary }} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ fontSize: 11, fill: TOKEN.textSecondary }}
              width={80}
            />
            <Tooltip
              contentStyle={{
                background: TOKEN.bgWhite,
                border: `1px solid ${TOKEN.border}`,
                borderRadius: '8px',
                fontSize: 12,
              }}
            />
            <Bar dataKey="total" fill={TOKEN.primaryLight} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

// -----------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------

export default function DashboardCharts({ weeklyData, followupRate, keywordData }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <WeeklyChart data={weeklyData} />
      <FollowupDonut data={followupRate} />
      <div className="lg:col-span-2">
        <KeywordCategoryChart data={keywordData} />
      </div>
    </div>
  )
}
