'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

// mirrors tailwind.config.ts
const TOKEN = {
  primary:      '#2563EB',
  border:       '#E2E8F0',
  textSecondary:'#64748B',
  bgWhite:      '#FFFFFF',
} as const

export interface MonthlyUsage {
  month: string
  mensagens: number
}

interface Props {
  data: MonthlyUsage[]
}

export default function AdminUsageChart({ data }: Props) {
  const hasData = data.some((d) => d.mensagens > 0)

  if (!hasData) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-text-secondary">
        Nenhuma mensagem registrada nos últimos 6 meses.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={TOKEN.border} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: TOKEN.textSecondary }} />
        <YAxis tick={{ fontSize: 11, fill: TOKEN.textSecondary }} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            background: TOKEN.bgWhite,
            border: `1px solid ${TOKEN.border}`,
            borderRadius: '8px',
            fontSize: 12,
          }}
        />
        <Line
          type="monotone"
          dataKey="mensagens"
          stroke={TOKEN.primary}
          strokeWidth={2}
          dot={{ fill: TOKEN.primary, r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
