'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, RefreshCw } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { FieldLabel } from '@/components/ui/FieldLabel'
import {
  maskCpf,
  maskPhone,
  displayCpf,
  displayPhone,
  getToken,
  STATUS_CONFIG,
  type PatientStatus,
} from '@/lib/patient/helpers'

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

interface Patient {
  id: string
  cpf: string
  name: string
  first_name: string
  phone_whatsapp: string
  health_plan: string | null
  status: PatientStatus
  recurrence_flag: boolean
  last_interaction_at: string | null
  created_at: string
}

interface PatientsClientProps {
  initialPatients: Patient[]
}

// -----------------------------------------------------------------------
// Status badge
// -----------------------------------------------------------------------

function StatusBadge({ status }: { status: PatientStatus }) {
  const cfg = STATUS_CONFIG[status]
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  )
}

// -----------------------------------------------------------------------
// Main component
// -----------------------------------------------------------------------

const inputClass =
  'rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow w-full'

const emptyForm = {
  cpf: '',
  name: '',
  phone_whatsapp: '',
  birth_date: '',
  sex: '' as '' | 'M' | 'F',
  health_plan: '',
  address: '',
  general_info: '',
  recurrence_flag: false,
}

type StatusFilter = '' | PatientStatus

export function PatientsClient({ initialPatients }: PatientsClientProps) {
  const router = useRouter()
  const [patients, setPatients] = useState<Patient[]>(initialPatients)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  // -----------------------------------------------------------------------
  // Filtering (client-side on the initial data; server-side on refresh)
  // -----------------------------------------------------------------------

  const filtered = useMemo(() => {
    return patients.filter((p) => {
      const matchesStatus = statusFilter === '' || p.status === statusFilter
      const term = search.toLowerCase().replace(/\D/g, '')
      const matchesSearch =
        search === '' ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (term.length >= 3 && p.cpf.includes(term))
      return matchesStatus && matchesSearch
    })
  }, [patients, search, statusFilter])

  // -----------------------------------------------------------------------
  // Form handlers
  // -----------------------------------------------------------------------

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setForm((prev) => ({ ...prev, [name]: checked }))
      return
    }
    if (name === 'cpf') { setForm((prev) => ({ ...prev, cpf: maskCpf(value) })); return }
    if (name === 'phone_whatsapp') { setForm((prev) => ({ ...prev, phone_whatsapp: maskPhone(value) })); return }
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const token = await getToken()
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/patients`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...form,
            birth_date: form.birth_date || null,
            sex: form.sex || null,
            health_plan: form.health_plan || null,
            address: form.address || null,
            general_info: form.general_info || null,
          }),
        },
      )

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body?.error?.message ?? `Erro ao criar paciente (${res.status})`)
        return
      }

      const { data } = await res.json()
      setPatients((prev) => [data, ...prev])
      setOpen(false)
      setForm(emptyForm)
      router.refresh()
    } catch {
      setError('Erro de conexão. Verifique se a API está rodando.')
    } finally {
      setLoading(false)
    }
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por nome ou CPF..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow w-full"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
          >
            <option value="">Todos os status</option>
            <option value="review">Aguardando revisão</option>
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
          </select>
        </div>

        {/* Novo paciente */}
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger asChild>
            <button className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark transition-colors shrink-0">
              <Plus className="h-4 w-4" />
              Novo Paciente
            </button>
          </Dialog.Trigger>

          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
            <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl bg-background shadow-xl p-6">
              <Dialog.Title className="text-base font-semibold text-text-primary mb-4">
                Novo Paciente
              </Dialog.Title>

              <form onSubmit={handleCreate} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <FieldLabel
                      label="Nome completo *"
                      htmlFor="p-name"
                      description="Nome como aparece nos documentos do paciente"
                      example="Maria Aparecida Souza"
                    >
                      <input
                        id="p-name"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        required
                        placeholder="Maria Aparecida Souza"
                        className={inputClass}
                      />
                    </FieldLabel>
                  </div>

                  <div>
                    <FieldLabel
                      label="CPF *"
                      htmlFor="p-cpf"
                      description="CPF único por clínica"
                      example="000.000.000-00"
                    >
                      <input
                        id="p-cpf"
                        name="cpf"
                        value={form.cpf}
                        onChange={handleChange}
                        required
                        placeholder="000.000.000-00"
                        inputMode="numeric"
                        className={inputClass}
                      />
                    </FieldLabel>
                  </div>

                  <div>
                    <FieldLabel
                      label="WhatsApp *"
                      htmlFor="p-phone"
                      description="Número com DDD e código do país"
                      example="+55 (11) 99999-0000"
                    >
                      <input
                        id="p-phone"
                        name="phone_whatsapp"
                        value={form.phone_whatsapp}
                        onChange={handleChange}
                        required
                        placeholder="+55 (11) 99999-0000"
                        inputMode="tel"
                        className={inputClass}
                      />
                    </FieldLabel>
                  </div>

                  <div>
                    <FieldLabel label="Nascimento" htmlFor="p-birth" description="Data de nascimento" example="1985-03-15">
                      <input
                        id="p-birth"
                        name="birth_date"
                        type="date"
                        value={form.birth_date}
                        onChange={handleChange}
                        className={inputClass}
                      />
                    </FieldLabel>
                  </div>

                  <div>
                    <FieldLabel label="Sexo" htmlFor="p-sex" description="Sexo biológico (opcional)" example="">
                      <select
                        id="p-sex"
                        name="sex"
                        value={form.sex}
                        onChange={handleChange}
                        className={inputClass}
                      >
                        <option value="">Não informado</option>
                        <option value="M">Masculino</option>
                        <option value="F">Feminino</option>
                      </select>
                    </FieldLabel>
                  </div>

                  <div className="col-span-2">
                    <FieldLabel
                      label="Plano de Saúde"
                      htmlFor="p-plan"
                      description="Operadora do convênio, se houver"
                      example="Unimed, Bradesco Saúde, Amil..."
                    >
                      <input
                        id="p-plan"
                        name="health_plan"
                        value={form.health_plan}
                        onChange={handleChange}
                        placeholder="Unimed"
                        className={inputClass}
                      />
                    </FieldLabel>
                  </div>

                  <div className="col-span-2">
                    <FieldLabel label="Endereço" htmlFor="p-addr" description="Endereço residencial" example="Rua das Flores, 123 — São Paulo/SP">
                      <input
                        id="p-addr"
                        name="address"
                        value={form.address}
                        onChange={handleChange}
                        placeholder="Rua das Flores, 123 — São Paulo/SP"
                        className={inputClass}
                      />
                    </FieldLabel>
                  </div>

                  <div className="col-span-2">
                    <FieldLabel
                      label="Informações Gerais"
                      htmlFor="p-info"
                      description="Observações clínicas, alergias, histórico relevante"
                      example="Alérgica a dipirona. Paciente com histórico de hipertensão."
                    >
                      <textarea
                        id="p-info"
                        name="general_info"
                        value={form.general_info}
                        onChange={handleChange}
                        rows={3}
                        placeholder="Observações relevantes sobre o paciente..."
                        className={inputClass}
                      />
                    </FieldLabel>
                  </div>

                  <div className="col-span-2 flex items-center gap-2">
                    <input
                      id="p-recurrence"
                      name="recurrence_flag"
                      type="checkbox"
                      checked={form.recurrence_flag}
                      onChange={handleChange}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <label htmlFor="p-recurrence" className="text-sm text-text-primary cursor-pointer">
                      Paciente recorrente
                    </label>
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-danger bg-red-50 border border-red-200 rounded-md px-3 py-2">
                    {error}
                  </p>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface transition-colors"
                    >
                      Cancelar
                    </button>
                  </Dialog.Close>
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Salvando...' : 'Salvar paciente'}
                  </button>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      {/* Counter */}
      <p className="text-sm text-text-secondary">
        {filtered.length} paciente{filtered.length !== 1 ? 's' : ''}
        {statusFilter || search ? ' (filtrado)' : ''}
      </p>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3 bg-surface rounded-lg border border-border">
          <RefreshCw className="h-8 w-8 text-text-secondary opacity-40" />
          <p className="text-sm text-text-secondary">Nenhum paciente encontrado.</p>
          {(search || statusFilter) && (
            <button
              onClick={() => { setSearch(''); setStatusFilter('') }}
              className="text-sm text-primary hover:underline"
            >
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">CPF</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary hidden md:table-cell">Plano</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary hidden lg:table-cell">Último contato</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {filtered.map((patient) => (
                <tr
                  key={patient.id}
                  onClick={() => router.push(`/clinic/patients/${patient.id}`)}
                  className="cursor-pointer hover:bg-surface transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-text-primary">{patient.name}</div>
                    <div className="text-xs text-text-secondary mt-0.5">
                      {displayPhone(patient.phone_whatsapp)}
                      {patient.recurrence_flag && (
                        <span className="ml-2 text-primary">● Recorrente</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-text-secondary">
                    {displayCpf(patient.cpf)}
                  </td>
                  <td className="px-4 py-3 text-text-secondary hidden md:table-cell">
                    {patient.health_plan ?? <span className="text-text-secondary opacity-50">—</span>}
                  </td>
                  <td className="px-4 py-3 text-text-secondary hidden lg:table-cell">
                    {patient.last_interaction_at
                      ? new Date(patient.last_interaction_at).toLocaleDateString('pt-BR')
                      : <span className="opacity-50">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={patient.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
