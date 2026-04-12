'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import * as Tabs from '@radix-ui/react-tabs'
import { Clock, FileText, CalendarDays, MessageSquare, Trash2 } from 'lucide-react'
import { FieldLabel } from '@/components/ui/FieldLabel'
import type { Tables } from '@crm/database'
import {
  maskCpf,
  maskPhone,
  getToken,
  STATUS_CONFIG,
  type PatientStatus,
} from '@/lib/patient/helpers'

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

type Patient = Tables<'patients'>

interface PatientDetailClientProps {
  patient: Patient
}

// -----------------------------------------------------------------------
// Status badge + selector
// -----------------------------------------------------------------------

function StatusBadge({ status }: { status: PatientStatus }) {
  const cfg = STATUS_CONFIG[status]
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${cfg.className}`}>
      <Icon className="h-4 w-4" />
      {cfg.label}
    </span>
  )
}

// -----------------------------------------------------------------------
// Tab: Dados
// -----------------------------------------------------------------------

const inputClass =
  'rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow w-full disabled:bg-surface disabled:text-text-secondary'

function DadosTab({ patient }: { patient: Patient }) {
  const router = useRouter()
  const [form, setForm] = useState({
    name: patient.name,
    cpf: patient.cpf.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'),
    phone_whatsapp: maskPhone(patient.phone_whatsapp),
    birth_date: patient.birth_date ?? '',
    sex: patient.sex ?? '',
    health_plan: patient.health_plan ?? '',
    address: patient.address ?? '',
    general_info: patient.general_info ?? '',
    recurrence_flag: patient.recurrence_flag,
    status: patient.status as PatientStatus,
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const token = await getToken()
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/patients/${patient.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
        setError(body?.error?.message ?? `Erro ao salvar (${res.status})`)
        return
      }
      setSuccess(true)
      router.refresh()
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      setError('Erro de conexão.')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(newStatus: PatientStatus) {
    const previous = form.status
    setForm((prev) => ({ ...prev, status: newStatus })) // optimistic update
    try {
      const token = await getToken()
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/patients/${patient.id}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ status: newStatus }),
        },
      )
      if (!res.ok) {
        setForm((prev) => ({ ...prev, status: previous })) // revert on API error
        return
      }
      router.refresh()
    } catch {
      setForm((prev) => ({ ...prev, status: previous })) // revert on network error
    }
  }

  async function handleDelete() {
    if (!confirm(`Deseja remover ${patient.name}? Esta ação desativa o paciente.`)) return
    setDeleting(true)
    try {
      const token = await getToken()
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/patients/${patient.id}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
      )
      if (res.ok) router.push('/clinic/patients')
    } catch {
      setError('Erro ao remover paciente.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="max-w-2xl flex flex-col gap-5">
      {/* Status header */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-text-secondary">Status:</span>
          <StatusBadge status={form.status} />
        </div>
        <div className="flex items-center gap-2">
          {(['review', 'active', 'inactive'] as PatientStatus[]).map((s) => (
            s !== form.status && (
              <button
                key={s}
                type="button"
                onClick={() => handleStatusChange(s)}
                className="text-xs rounded-md border border-border px-2.5 py-2 min-h-[36px] text-text-secondary hover:bg-background hover:text-text-primary transition-colors"
              >
                Marcar como {STATUS_CONFIG[s].label.toLowerCase()}
              </button>
            )
          ))}
        </div>
      </div>

      {patient.status === 'review' && (
        <div className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          <Clock className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            Paciente importado via integração externa. Revise os dados e altere o status para{' '}
            <strong>Ativo</strong> para iniciar o envio de mensagens.
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <FieldLabel label="Nome completo *" htmlFor="d-name" description="Nome como aparece nos documentos" example="Maria Aparecida Souza">
            <input id="d-name" name="name" value={form.name} onChange={handleChange} required className={inputClass} />
          </FieldLabel>
        </div>

        <div>
          <FieldLabel label="CPF *" htmlFor="d-cpf" description="CPF único por clínica" example="000.000.000-00">
            <input id="d-cpf" name="cpf" value={form.cpf} onChange={handleChange} required inputMode="numeric" className={inputClass} />
          </FieldLabel>
        </div>

        <div>
          <FieldLabel label="WhatsApp *" htmlFor="d-phone" description="Número com DDD e código do país" example="+55 (11) 99999-0000">
            <input id="d-phone" name="phone_whatsapp" value={form.phone_whatsapp} onChange={handleChange} required inputMode="tel" className={inputClass} />
          </FieldLabel>
        </div>

        <div>
          <FieldLabel label="Nascimento" htmlFor="d-birth" description="Data de nascimento" example="1985-03-15">
            <input id="d-birth" name="birth_date" type="date" value={form.birth_date} onChange={handleChange} className={inputClass} />
          </FieldLabel>
        </div>

        <div>
          <FieldLabel label="Sexo" htmlFor="d-sex" description="Sexo biológico (opcional)" example="">
            <select id="d-sex" name="sex" value={form.sex} onChange={handleChange} className={inputClass}>
              <option value="">Não informado</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
            </select>
          </FieldLabel>
        </div>

        <div className="col-span-2">
          <FieldLabel label="Plano de Saúde" htmlFor="d-plan" description="Operadora do convênio, se houver" example="Unimed">
            <input id="d-plan" name="health_plan" value={form.health_plan} onChange={handleChange} placeholder="Unimed" className={inputClass} />
          </FieldLabel>
        </div>

        <div className="col-span-2">
          <FieldLabel label="Endereço" htmlFor="d-addr" description="Endereço residencial" example="Rua das Flores, 123 — São Paulo/SP">
            <input id="d-addr" name="address" value={form.address} onChange={handleChange} className={inputClass} />
          </FieldLabel>
        </div>

        <div className="col-span-2">
          <FieldLabel label="Informações Gerais" htmlFor="d-info" description="Observações clínicas, alergias, histórico" example="Alérgica a dipirona.">
            <textarea id="d-info" name="general_info" value={form.general_info} onChange={handleChange} rows={4} className={inputClass} />
          </FieldLabel>
        </div>

        <div className="col-span-2 flex items-center gap-2">
          <input
            id="d-recurrence"
            name="recurrence_flag"
            type="checkbox"
            checked={form.recurrence_flag}
            onChange={handleChange}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          <label htmlFor="d-recurrence" className="text-sm text-text-primary cursor-pointer">
            Paciente recorrente
          </label>
        </div>
      </div>

      {error && (
        <p className="text-sm text-danger bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
      )}
      {success && (
        <p className="text-sm text-success bg-green-50 border border-green-200 rounded-md px-3 py-2">Dados salvos com sucesso.</p>
      )}

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-1.5 text-sm text-danger hover:underline disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          {deleting ? 'Removendo...' : 'Remover paciente'}
        </button>

        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>
    </form>
  )
}

// -----------------------------------------------------------------------
// Tab: Documentos (placeholder — Etapa futura)
// -----------------------------------------------------------------------

function DocumentosTab() {
  return (
    <div className="max-w-2xl">
      <div className="rounded-lg border border-border bg-surface p-6 flex flex-col items-center gap-3 text-center">
        <FileText className="h-10 w-10 text-text-secondary opacity-40" />
        <p className="font-medium text-text-primary">Upload de documentos</p>
        <p className="text-sm text-text-secondary max-w-sm">
          Receitas, laudos e exames serão disponibilizados aqui. A IA extrai automaticamente
          medicamentos, exames e retornos para montar a agenda de follow-ups.
        </p>
        <p className="text-xs text-text-secondary opacity-60">Disponível na próxima etapa de implementação.</p>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------
// Tab: Agenda de Follow-ups (placeholder — Etapa futura)
// -----------------------------------------------------------------------

function AgendaTab() {
  return (
    <div className="max-w-2xl">
      <div className="rounded-lg border border-border bg-surface p-6 flex flex-col items-center gap-3 text-center">
        <CalendarDays className="h-10 w-10 text-text-secondary opacity-40" />
        <p className="font-medium text-text-primary">Agenda de Follow-ups</p>
        <p className="text-sm text-text-secondary max-w-sm">
          Os follow-ups programados para este paciente aparecerão aqui com data,
          tipo (medicamento, exame, retorno), status e ações de edição.
        </p>
        <p className="text-xs text-text-secondary opacity-60">Disponível após a implementação do Motor de Follow-ups (Etapa 10).</p>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------
// Root component
// -----------------------------------------------------------------------

export function PatientDetailClient({ patient }: PatientDetailClientProps) {
  const router = useRouter()

  return (
    <div className="flex flex-col gap-1">
      {/* Link para conversa */}
      <div className="flex justify-end mb-2">
        <button
          onClick={() => router.push(`/clinic/conversations?patient=${patient.id}`)}
          className="flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <MessageSquare className="h-4 w-4" />
          Ver conversa
        </button>
      </div>

      <Tabs.Root defaultValue="dados">
        <Tabs.List className="flex border-b border-border mb-6">
          <Tabs.Trigger value="dados" className="data-[state=active]:border-primary data-[state=active]:text-primary data-[state=inactive]:border-transparent data-[state=inactive]:text-text-secondary px-4 py-2.5 text-sm font-medium border-b-2 transition-colors hover:text-text-primary">
            Dados
          </Tabs.Trigger>
          <Tabs.Trigger value="documentos" className="data-[state=active]:border-primary data-[state=active]:text-primary data-[state=inactive]:border-transparent data-[state=inactive]:text-text-secondary px-4 py-2.5 text-sm font-medium border-b-2 transition-colors hover:text-text-primary">
            Documentos
          </Tabs.Trigger>
          <Tabs.Trigger value="agenda" className="data-[state=active]:border-primary data-[state=active]:text-primary data-[state=inactive]:border-transparent data-[state=inactive]:text-text-secondary px-4 py-2.5 text-sm font-medium border-b-2 transition-colors hover:text-text-primary">
            Agenda de Follow-ups
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="dados">
          <DadosTab patient={patient} />
        </Tabs.Content>
        <Tabs.Content value="documentos">
          <DocumentosTab />
        </Tabs.Content>
        <Tabs.Content value="agenda">
          <AgendaTab />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  )
}
