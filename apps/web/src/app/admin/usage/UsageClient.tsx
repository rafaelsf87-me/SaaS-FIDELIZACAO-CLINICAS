'use client'

import { useState, useMemo } from 'react'
import { Download } from 'lucide-react'

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

export interface UsageRow {
  tenant_id: string
  clinicName: string
  messages_sent: number
  messages_received: number
  ai_tokens_input: number
  ai_tokens_output: number
  audio_minutes_processed: number
  documents_processed: number
}

export interface MonthOption {
  value: string   // YYYY-MM
  label: string   // "Abril 2026"
}

interface Props {
  allMonths: MonthOption[]
  dataByMonth: Record<string, UsageRow[]>
}

// -----------------------------------------------------------------------
// CSV export
// -----------------------------------------------------------------------

function exportCSV(rows: UsageRow[], month: string) {
  const headers = [
    'Clínica',
    'Msgs Enviadas',
    'Msgs Recebidas',
    'Tokens Input',
    'Tokens Output',
    'Áudio (min)',
    'Docs Processados',
  ]

  const csvRows = [
    headers.join(','),
    ...rows.map((r) =>
      [
        `"${r.clinicName}"`,
        r.messages_sent,
        r.messages_received,
        r.ai_tokens_input,
        r.ai_tokens_output,
        r.audio_minutes_processed,
        r.documents_processed,
      ].join(',')
    ),
  ]

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `uso_${month}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------

export default function UsageClient({ allMonths, dataByMonth }: Props) {
  const [selectedMonth, setSelectedMonth] = useState<string>(allMonths[0]?.value ?? '')

  const rows = useMemo(() => dataByMonth[selectedMonth] ?? [], [dataByMonth, selectedMonth])

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <label className="sr-only" htmlFor="month-select">Mês de referência</label>
        <select
          id="month-select"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {allMonths.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>

        <button
          onClick={() => exportCSV(rows, selectedMonth)}
          disabled={rows.length === 0}
          className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary hover:bg-surface transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </button>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-border bg-background overflow-x-auto">
        {rows.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-text-secondary">
            Nenhum dado de uso registrado para este mês.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface text-text-secondary text-left">
                <th className="px-4 py-3 font-medium whitespace-nowrap">Clínica</th>
                <th className="px-4 py-3 font-medium text-right whitespace-nowrap">Msgs Env.</th>
                <th className="px-4 py-3 font-medium text-right whitespace-nowrap">Msgs Rec.</th>
                <th className="px-4 py-3 font-medium text-right whitespace-nowrap">Tokens In</th>
                <th className="px-4 py-3 font-medium text-right whitespace-nowrap">Tokens Out</th>
                <th className="px-4 py-3 font-medium text-right whitespace-nowrap">Áudio (min)</th>
                <th className="px-4 py-3 font-medium text-right whitespace-nowrap">Docs</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.tenant_id}
                  className={`border-t border-border ${i % 2 === 1 ? 'bg-surface/40' : ''}`}
                >
                  <td className="px-4 py-3 text-text-primary font-medium">{row.clinicName}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-text-primary">
                    {row.messages_sent.toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-text-primary">
                    {row.messages_received.toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-text-primary">
                    {row.ai_tokens_input.toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-text-primary">
                    {row.ai_tokens_output.toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-text-primary">
                    {Number(row.audio_minutes_processed).toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-text-primary">
                    {row.documents_processed}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
