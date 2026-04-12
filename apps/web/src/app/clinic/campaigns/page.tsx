import { PageHeader } from '@/components/layouts/PageHeader'
import { Megaphone, Users, CalendarDays, BarChart3 } from 'lucide-react'

// -----------------------------------------------------------------------
// Mock campaign preview cards
// -----------------------------------------------------------------------

const MOCK_CAMPAIGNS = [
  {
    id: 1,
    name: 'Retorno pós-consulta — Ortopedia',
    target: 'Pacientes ortopédicos inativos há 60 dias',
    scheduled: '15/05/2025',
    status: 'Rascunho',
    reach: 142,
  },
  {
    id: 2,
    name: 'Campanha Inverno — Check-up preventivo',
    target: 'Todos os pacientes ativos',
    scheduled: '01/06/2025',
    status: 'Agendado',
    reach: 389,
  },
  {
    id: 3,
    name: 'Pilates — Vagas abertas',
    target: 'Pacientes de fisioterapia',
    scheduled: '—',
    status: 'Rascunho',
    reach: 57,
  },
]

// -----------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------

export default function ClinicCampaignsPage() {
  return (
    <>
      <PageHeader title="Campanhas" breadcrumb={['Clínica', 'Campanhas']} />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl flex flex-col items-center gap-8 py-8">
          {/* Hero */}
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="rounded-2xl bg-primary/10 p-5">
              <Megaphone className="h-12 w-12 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-text-primary">Campanhas em Massa</h1>
              <p className="text-sm text-text-secondary mt-1 max-w-sm">
                Envie mensagens segmentadas para grupos específicos de pacientes — em breve.
              </p>
            </div>
            <button
              disabled
              className="flex items-center gap-2 rounded-md bg-primary/40 px-5 py-2.5 text-sm font-semibold text-white cursor-not-allowed"
            >
              <Megaphone className="h-4 w-4" />
              Criar Campanha
            </button>
          </div>

          {/* Preview cards */}
          <div className="w-full flex flex-col gap-4">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
              Exemplo de campanhas
            </p>

            {MOCK_CAMPAIGNS.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-border bg-background p-4 flex flex-col gap-3 opacity-60 pointer-events-none select-none"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm text-text-primary">{c.name}</p>
                    <p className="text-xs text-text-secondary mt-0.5">{c.target}</p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                    c.status === 'Agendado'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-surface text-text-secondary border-border'
                  }`}>
                    {c.status}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-text-secondary">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {c.reach} pacientes
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {c.scheduled}
                  </span>
                  <span className="flex items-center gap-1">
                    <BarChart3 className="h-3.5 w-3.5" />
                    Relatório
                  </span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-text-secondary opacity-60 text-center">
            Disponível após integração com WhatsApp (Etapa 8)
          </p>
        </div>
      </main>
    </>
  )
}
