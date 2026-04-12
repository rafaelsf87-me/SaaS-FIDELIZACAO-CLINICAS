'use client'

import React, { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, Download, Search } from 'lucide-react'

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

export interface AuditLogRow {
  id: string
  created_at: string
  tenant_id: string | null
  patient_id: string | null
  action: string
  actor: string
  details: Record<string, unknown> | null
  clinicName?: string | undefined
  patientName?: string | undefined
}

export interface ClinicOption {
  id: string
  name: string
}

interface Props {
  logs: AuditLogRow[]
  clinics: ClinicOption[]
}

const PAGE_SIZE = 20

const ACTOR_LABELS: Record<string, string> = {
  ai: 'IA',
  secretary: 'Secretária',
  system: 'Sistema',
  admin: 'Admin',
}

// -----------------------------------------------------------------------
// CSV export
// -----------------------------------------------------------------------

function exportCSV(logs: AuditLogRow[]) {
  const headers = ['Data/Hora', 'Clínica', 'Paciente', 'Ação', 'Ator', 'Detalhes']
  const rows = [
    headers.join(','),
    ...logs.map((l) =>
      [
        `"${new Date(l.created_at).toLocaleString('pt-BR')}"`,
        `"${l.clinicName ?? '—'}"`,
        `"${l.patientName ?? '—'}"`,
        `"${l.action}"`,
        `"${ACTOR_LABELS[l.actor] ?? l.actor}"`,
        `"${l.details ? JSON.stringify(l.details).replace(/"/g, '""') : ''}"`,
      ].join(',')
    ),
  ]
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `audit_${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------

export default function AuditClient({ logs, clinics }: Props) {
  const [clinicFilter, setClinicFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [actorFilter, setActorFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (clinicFilter && l.tenant_id !== clinicFilter) return false
      if (actorFilter && l.actor !== actorFilter) return false
      if (actionFilter && !l.action.toLowerCase().includes(actionFilter.toLowerCase())) return false
      if (dateFrom && l.created_at < dateFrom) return false
      if (dateTo && l.created_at > dateTo + 'T23:59:59') return false
      return true
    })
  }, [logs, clinicFilter, actorFilter, actionFilter, dateFrom, dateTo])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function resetFilters() {
    setClinicFilter('')
    setActionFilter('')
    setActorFilter('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  const hasFilters = clinicFilter || actorFilter || actionFilter || dateFrom || dateTo

  return (
    <div className="flex flex-col gap-4">
      {/* Filtros */}
      <div className="rounded-xl border border-border bg-background p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Clínica */}
          <div>
            <label className="sr-only" htmlFor="audit-clinic">Clínica</label>
            <select
              id="audit-clinic"
              value={clinicFilter}
              onChange={(e) => { setClinicFilter(e.target.value); setPage(1) }}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Todas as clínicas</option>
              {clinics.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Ator */}
          <div>
            <label className="sr-only" htmlFor="audit-actor">Ator</label>
            <select
              id="audit-actor"
              value={actorFilter}
              onChange={(e) => { setActorFilter(e.target.value); setPage(1) }}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Todos os atores</option>
              {Object.entries(ACTOR_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Ação (texto livre) */}
          <div className="relative">
            <label className="sr-only" htmlFor="audit-action">Filtrar por ação</label>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary pointer-events-none" />
            <input
              id="audit-action"
              type="text"
              placeholder="Filtrar por ação..."
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1) }}
              className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Período */}
          <div className="flex gap-2">
            <label className="sr-only" htmlFor="audit-date-from">Data início</label>
            <input
              id="audit-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <label className="sr-only" htmlFor="audit-date-to">Data fim</label>
            <input
              id="audit-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {hasFilters && (
          <button
            onClick={resetFilters}
            className="mt-3 text-xs text-primary hover:underline"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Ações */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          {filtered.length} registro{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={() => exportCSV(filtered)}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary hover:bg-surface transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </button>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-border bg-background overflow-hidden">
        {paginated.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-text-secondary">
            Nenhum log encontrado com os filtros aplicados.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface text-text-secondary text-left">
                <th className="px-4 py-3 font-medium whitespace-nowrap">Data/Hora</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Clínica</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Paciente</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Ação</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Ator</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((log, i) => (
                <React.Fragment key={log.id}>
                  <tr
                    className={`border-t border-border ${i % 2 === 1 ? 'bg-surface/40' : ''}`}
                  >
                    <td className="px-4 py-3 text-text-secondary whitespace-nowrap tabular-nums">
                      {new Date(log.created_at).toLocaleString('pt-BR', {
                        day: '2-digit', month: '2-digit', year: '2-digit',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 text-text-primary">{log.clinicName ?? '—'}</td>
                    <td className="px-4 py-3 text-text-primary">{log.patientName ?? '—'}</td>
                    <td className="px-4 py-3 text-text-primary font-medium">{log.action}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-primary-lighter px-2 py-0.5 text-xs font-medium text-primary-dark">
                        {ACTOR_LABELS[log.actor] ?? log.actor}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {log.details ? (
                        <button
                          onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                          className="flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          {expandedId === log.id ? (
                            <><ChevronUp className="h-3 w-3" />Ocultar</>
                          ) : (
                            <><ChevronDown className="h-3 w-3" />Ver</>
                          )}
                        </button>
                      ) : (
                        <span className="text-text-secondary text-xs">—</span>
                      )}
                    </td>
                  </tr>
                  {expandedId === log.id && log.details && (
                    <tr className="border-t border-border bg-surface">
                      <td colSpan={6} className="px-4 py-3">
                        <pre className="text-xs text-text-secondary whitespace-pre-wrap font-mono overflow-x-auto max-h-40">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-secondary">
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-border px-3 py-1.5 text-text-primary hover:bg-surface transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-border px-3 py-1.5 text-text-primary hover:bg-surface transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
