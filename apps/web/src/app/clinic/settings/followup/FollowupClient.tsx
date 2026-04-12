'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Copy } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { FieldLabel } from '@/components/ui/FieldLabel'
import { getToken } from '@/lib/patient/helpers'

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

type TriggerType = 'medication' | 'exam' | 'return' | 'custom'

interface Scenario {
  id: string
  name: string
  trigger_type: TriggerType
  interval_days: number
  repeat_every_days: number | null
  max_repeats: number
  message_template: string | null
  active: boolean
  is_default: boolean
  tenant_id: string | null
}

interface FollowupClientProps {
  initialScenarios: Scenario[]
  inactivityEnabled: boolean
  contextualEnabled: boolean
}

const TRIGGER_LABELS: Record<TriggerType, string> = {
  medication: 'Medicamento',
  exam: 'Exame',
  return: 'Retorno',
  custom: 'Personalizado',
}

const inputClass =
  'rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow w-full'

const emptyForm = {
  name: '',
  trigger_type: 'custom' as TriggerType,
  interval_days: 7,
  repeat_every_days: '' as number | '',
  max_repeats: 1,
  message_template: '',
}

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------

export function FollowupClient({
  initialScenarios,
  inactivityEnabled,
  contextualEnabled,
}: FollowupClientProps) {
  const router = useRouter()
  const [scenarios, setScenarios] = useState<Scenario[]>(initialScenarios)
  const [inactivity, setInactivity] = useState(inactivityEnabled)
  const [contextual, setContextual] = useState(contextualEnabled)
  const [savingToggles, setSavingToggles] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Scenario | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function saveToggles(newInactivity: boolean, newContextual: boolean) {
    setSavingToggles(true)
    try {
      const token = await getToken()
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/settings/clinic`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          followup_inactivity_enabled: newInactivity,
          followup_contextual_enabled: newContextual,
        }),
      })
      router.refresh()
    } catch {
      // revert on error
      setInactivity(inactivityEnabled)
      setContextual(contextualEnabled)
    } finally {
      setSavingToggles(false)
    }
  }

  function handleToggleInactivity() {
    const next = !inactivity
    setInactivity(next)
    saveToggles(next, contextual)
  }

  function handleToggleContextual() {
    const next = !contextual
    setContextual(next)
    saveToggles(inactivity, next)
  }

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setError(null)
    setOpen(true)
  }

  function openEdit(scenario: Scenario) {
    setEditing(scenario)
    setForm({
      name: scenario.name,
      trigger_type: scenario.trigger_type,
      interval_days: scenario.interval_days,
      repeat_every_days: scenario.repeat_every_days ?? '',
      max_repeats: scenario.max_repeats,
      message_template: scenario.message_template ?? '',
    })
    setError(null)
    setOpen(true)
  }

  async function handlePersonalize(scenario: Scenario) {
    setLoading(true)
    try {
      const token = await getToken()
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/followup-scenarios`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            name: `${scenario.name} (personalizado)`,
            trigger_type: scenario.trigger_type,
            interval_days: scenario.interval_days,
            repeat_every_days: scenario.repeat_every_days,
            max_repeats: scenario.max_repeats,
            message_template: scenario.message_template,
          }),
        },
      )
      if (res.ok) {
        const { data } = await res.json()
        setScenarios((prev) => [...prev, data])
        router.refresh()
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      const url = editing
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1/followup-scenarios/${editing.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/v1/followup-scenarios`
      const method = editing ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: form.name,
          trigger_type: form.trigger_type,
          interval_days: Number(form.interval_days),
          repeat_every_days: form.repeat_every_days !== '' ? Number(form.repeat_every_days) : null,
          max_repeats: Number(form.max_repeats),
          message_template: form.message_template || null,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body?.error ?? `Erro (${res.status})`)
        return
      }

      const { data } = await res.json()
      if (editing) {
        setScenarios((prev) => prev.map((s) => (s.id === editing.id ? data : s)))
      } else {
        setScenarios((prev) => [...prev, data])
      }
      setOpen(false)
      router.refresh()
    } catch {
      setError('Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(scenarioId: string) {
    try {
      const token = await getToken()
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/followup-scenarios/${scenarioId}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
      )
      if (res.ok) {
        setScenarios((prev) => prev.filter((s) => s.id !== scenarioId))
        router.refresh()
      }
    } catch {
      // silent
    }
  }

  const toggleClass = (enabled: boolean) =>
    `relative inline-flex h-6 w-11 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
      enabled ? 'bg-primary' : 'bg-border'
    } ${savingToggles ? 'opacity-50 pointer-events-none' : ''}`

  const thumbClass = (enabled: boolean) =>
    `inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
      enabled ? 'translate-x-5' : 'translate-x-0'
    }`

  return (
    <div className="max-w-3xl flex flex-col gap-6">
      {/* Toggles */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text-primary">Configurações gerais</h2>

        <div className="flex items-start justify-between rounded-lg border border-border bg-background px-4 py-3">
          <div>
            <p className="text-sm font-medium text-text-primary">FUP por inatividade</p>
            <p className="text-xs text-text-secondary mt-0.5">
              Mensagem automática quando o paciente fica sem contato por X dias
            </p>
          </div>
          <button
            role="switch"
            aria-checked={inactivity}
            aria-label="FUP por inatividade"
            onClick={handleToggleInactivity}
            className={toggleClass(inactivity)}
          >
            <span className={thumbClass(inactivity)} />
          </button>
        </div>

        <div className="flex items-start justify-between rounded-lg border border-border bg-background px-4 py-3">
          <div>
            <p className="text-sm font-medium text-text-primary">FUP contextual</p>
            <p className="text-xs text-text-secondary mt-0.5">
              Baseado em documentos e interações do paciente (medicamentos, exames, retornos)
            </p>
          </div>
          <button
            role="switch"
            aria-checked={contextual}
            aria-label="FUP contextual"
            onClick={handleToggleContextual}
            className={toggleClass(contextual)}
          >
            <span className={thumbClass(contextual)} />
          </button>
        </div>
      </section>

      {/* Tabela de cenários */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">Cenários de Follow-up</h2>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
          >
            <Plus className="h-4 w-4" />
            Novo Cenário
          </button>
        </div>

        {scenarios.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-6 text-center text-sm text-text-secondary">
            Nenhum cenário cadastrado.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm" aria-label="Cenários de follow-up">
              <thead className="bg-surface border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-text-secondary">Nome</th>
                  <th className="px-4 py-3 text-left font-medium text-text-secondary hidden md:table-cell">Tipo</th>
                  <th className="px-4 py-3 text-left font-medium text-text-secondary hidden lg:table-cell">Intervalo</th>
                  <th className="px-4 py-3 text-left font-medium text-text-secondary hidden lg:table-cell">Reps.</th>
                  <th className="px-4 py-3 text-left font-medium text-text-secondary">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-text-secondary">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background">
                {scenarios.map((s) => (
                  <tr key={s.id} className="hover:bg-surface transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-primary">{s.name}</span>
                        {s.is_default && (
                          <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                            Padrão
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-secondary hidden md:table-cell">
                      {TRIGGER_LABELS[s.trigger_type]}
                    </td>
                    <td className="px-4 py-3 text-text-secondary hidden lg:table-cell">
                      {s.interval_days}d
                    </td>
                    <td className="px-4 py-3 text-text-secondary hidden lg:table-cell">
                      {s.max_repeats}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        s.active
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-surface text-text-secondary border border-border'
                      }`}>
                        {s.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {s.is_default ? (
                          <button
                            onClick={() => handlePersonalize(s)}
                            disabled={loading}
                            title="Criar cópia personalizada"
                            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-text-secondary border border-border hover:bg-surface disabled:opacity-50 transition-colors"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            Personalizar
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => openEdit(s)}
                              className="rounded p-1.5 text-text-secondary hover:bg-surface hover:text-text-primary transition-colors"
                              aria-label={`Editar ${s.name}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <AlertDialog.Root>
                              <AlertDialog.Trigger asChild>
                                <button
                                  className="rounded p-1.5 text-text-secondary hover:bg-red-50 hover:text-danger transition-colors"
                                  aria-label={`Remover ${s.name}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </AlertDialog.Trigger>
                              <AlertDialog.Portal>
                                <AlertDialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
                                <AlertDialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100vw-2rem)] max-w-md rounded-xl bg-background shadow-xl p-6">
                                  <AlertDialog.Title className="text-base font-semibold text-text-primary mb-2">
                                    Remover cenário
                                  </AlertDialog.Title>
                                  <AlertDialog.Description className="text-sm text-text-secondary mb-5">
                                    Remover <strong>{s.name}</strong>?
                                  </AlertDialog.Description>
                                  <div className="flex justify-end gap-3">
                                    <AlertDialog.Cancel asChild>
                                      <button className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface transition-colors">
                                        Cancelar
                                      </button>
                                    </AlertDialog.Cancel>
                                    <AlertDialog.Action asChild>
                                      <button
                                        onClick={() => handleDelete(s.id)}
                                        className="rounded-md bg-danger px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                                      >
                                        Remover
                                      </button>
                                    </AlertDialog.Action>
                                  </div>
                                </AlertDialog.Content>
                              </AlertDialog.Portal>
                            </AlertDialog.Root>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Dialog */}
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-background shadow-xl p-6">
            <Dialog.Title className="text-base font-semibold text-text-primary mb-4">
              {editing ? 'Editar cenário' : 'Novo cenário'}
            </Dialog.Title>

            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <FieldLabel label="Nome *" htmlFor="fu-name" description="Nome descritivo do cenário" example="Lembrete de retorno pós-cirurgia">
                <input id="fu-name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required className={inputClass} />
              </FieldLabel>

              <FieldLabel label="Tipo de gatilho" htmlFor="fu-type" description="Contexto que aciona este cenário" example="">
                <select id="fu-type" value={form.trigger_type} onChange={(e) => setForm((p) => ({ ...p, trigger_type: e.target.value as TriggerType }))} className={inputClass}>
                  <option value="medication">Medicamento</option>
                  <option value="exam">Exame</option>
                  <option value="return">Retorno</option>
                  <option value="custom">Personalizado</option>
                </select>
              </FieldLabel>

              <div className="grid grid-cols-2 gap-4">
                <FieldLabel label="Intervalo (dias) *" htmlFor="fu-interval" description="Dias após o gatilho para envio" example="7">
                  <input id="fu-interval" type="number" min={1} value={form.interval_days} onChange={(e) => setForm((p) => ({ ...p, interval_days: Number(e.target.value) }))} required className={inputClass} />
                </FieldLabel>

                <FieldLabel label="Máx. repetições" htmlFor="fu-max" description="Número máximo de envios" example="3">
                  <input id="fu-max" type="number" min={1} value={form.max_repeats} onChange={(e) => setForm((p) => ({ ...p, max_repeats: Number(e.target.value) }))} className={inputClass} />
                </FieldLabel>
              </div>

              <FieldLabel label="Repetir a cada (dias)" htmlFor="fu-repeat" description="Intervalo entre repetições (opcional)" example="30">
                <input id="fu-repeat" type="number" min={1} value={form.repeat_every_days} onChange={(e) => setForm((p) => ({ ...p, repeat_every_days: e.target.value === '' ? '' : Number(e.target.value) }))} className={inputClass} placeholder="Deixe vazio para não repetir" />
              </FieldLabel>

              <FieldLabel label="Template da mensagem" htmlFor="fu-template" description="Modelo de mensagem (variáveis: {nome}, {clinica})" example="Olá {nome}, tudo bem? É hora de agendar seu retorno!">
                <textarea id="fu-template" value={form.message_template} onChange={(e) => setForm((p) => ({ ...p, message_template: e.target.value }))} rows={3} className={inputClass} />
              </FieldLabel>

              {error && (
                <p className="text-sm text-danger bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Dialog.Close asChild>
                  <button type="button" className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface transition-colors">
                    Cancelar
                  </button>
                </Dialog.Close>
                <button type="submit" disabled={loading} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  {loading ? 'Salvando...' : editing ? 'Salvar' : 'Criar cenário'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
