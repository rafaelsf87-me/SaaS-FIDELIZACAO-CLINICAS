'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import * as Tabs from '@radix-ui/react-tabs'
import { FieldLabel } from '@/components/ui/FieldLabel'
import { getToken } from '@/lib/patient/helpers'

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

type SpecialtyType = 'specialty' | 'procedure' | 'service'

interface Specialty {
  id: string
  name: string
  type: SpecialtyType
  contact_id: string | null
  active: boolean
}

interface Contact {
  id: string
  label: string
}

interface SpecialtiesClientProps {
  initialSpecialties: Specialty[]
  contacts: Contact[]
}

const TYPE_LABELS: Record<SpecialtyType, string> = {
  specialty: 'Especialidade',
  procedure: 'Procedimento',
  service: 'Serviço',
}

const inputClass =
  'rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow w-full'

const emptyForm = {
  name: '',
  type: 'specialty' as SpecialtyType,
  contact_id: '',
}

// -----------------------------------------------------------------------
// Specialty row
// -----------------------------------------------------------------------

function SpecialtyRow({
  item,
  contacts,
  onEdit,
  onDelete,
}: {
  item: Specialty
  contacts: Contact[]
  onEdit: (s: Specialty) => void
  onDelete: (id: string, name: string) => void
}) {
  const contactName = contacts.find((c) => c.id === item.contact_id)?.label

  return (
    <div className="flex items-start justify-between rounded-lg border border-border bg-background px-4 py-3">
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="font-medium text-sm text-text-primary">{item.name}</span>
        {contactName && (
          <span className="text-xs text-text-secondary">Contato: {contactName}</span>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-4">
        <button
          onClick={() => onEdit(item)}
          className="rounded p-1.5 text-text-secondary hover:bg-surface hover:text-text-primary transition-colors"
          aria-label={`Editar ${item.name}`}
        >
          <Pencil className="h-4 w-4" />
        </button>
        <AlertDialog.Root>
          <AlertDialog.Trigger asChild>
            <button
              className="rounded p-1.5 text-text-secondary hover:bg-red-50 hover:text-danger transition-colors"
              aria-label={`Remover ${item.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </AlertDialog.Trigger>
          <AlertDialog.Portal>
            <AlertDialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
            <AlertDialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100vw-2rem)] max-w-md rounded-xl bg-background shadow-xl p-6">
              <AlertDialog.Title className="text-base font-semibold text-text-primary mb-2">
                Remover item
              </AlertDialog.Title>
              <AlertDialog.Description className="text-sm text-text-secondary mb-5">
                Remover <strong>{item.name}</strong>?
              </AlertDialog.Description>
              <div className="flex justify-end gap-3">
                <AlertDialog.Cancel asChild>
                  <button className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface transition-colors">
                    Cancelar
                  </button>
                </AlertDialog.Cancel>
                <AlertDialog.Action asChild>
                  <button
                    onClick={() => onDelete(item.id, item.name)}
                    className="rounded-md bg-danger px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                  >
                    Remover
                  </button>
                </AlertDialog.Action>
              </div>
            </AlertDialog.Content>
          </AlertDialog.Portal>
        </AlertDialog.Root>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------
// Main component
// -----------------------------------------------------------------------

export function SpecialtiesClient({ initialSpecialties, contacts }: SpecialtiesClientProps) {
  const router = useRouter()
  const [specialties, setSpecialties] = useState<Specialty[]>(initialSpecialties)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Specialty | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const byType = (type: SpecialtyType) => specialties.filter((s) => s.type === type)

  function openCreate(type: SpecialtyType = 'specialty') {
    setEditing(null)
    setForm({ ...emptyForm, type })
    setError(null)
    setOpen(true)
  }

  function openEdit(item: Specialty) {
    setEditing(item)
    setForm({
      name: item.name,
      type: item.type,
      contact_id: item.contact_id ?? '',
    })
    setError(null)
    setOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      const url = editing
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1/settings/specialties/${editing.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/v1/settings/specialties`
      const method = editing ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          contact_id: form.contact_id || null,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body?.error ?? `Erro (${res.status})`)
        return
      }

      const { data } = await res.json()
      if (editing) {
        setSpecialties((prev) => prev.map((s) => (s.id === editing.id ? data : s)))
      } else {
        setSpecialties((prev) => [...prev, data])
      }
      setOpen(false)
      router.refresh()
    } catch {
      setError('Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(specId: string) {
    try {
      const token = await getToken()
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/settings/specialties/${specId}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
      )
      if (res.ok) {
        setSpecialties((prev) => prev.filter((s) => s.id !== specId))
        router.refresh()
      }
    } catch {
      // silent
    }
  }

  const tabTriggerClass = 'data-[state=active]:border-primary data-[state=active]:text-primary data-[state=inactive]:border-transparent data-[state=inactive]:text-text-secondary px-4 py-2.5 text-sm font-medium border-b-2 transition-colors hover:text-text-primary'

  function SectionContent({ type }: { type: SpecialtyType }) {
    const items = byType(type)
    return (
      <div className="flex flex-col gap-3 pt-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-secondary">{items.length} item{items.length !== 1 ? 's' : ''}</p>
          <button
            onClick={() => openCreate(type)}
            className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
          >
            <Plus className="h-4 w-4" />
            Novo
          </button>
        </div>
        {items.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-6 text-center text-sm text-text-secondary">
            Nenhum item cadastrado.
          </div>
        ) : (
          items.map((s) => (
            <SpecialtyRow
              key={s.id}
              item={s}
              contacts={contacts}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <Tabs.Root defaultValue="specialty">
        <Tabs.List className="flex border-b border-border">
          <Tabs.Trigger value="specialty" className={tabTriggerClass}>
            Especialidades ({byType('specialty').length})
          </Tabs.Trigger>
          <Tabs.Trigger value="procedure" className={tabTriggerClass}>
            Procedimentos ({byType('procedure').length})
          </Tabs.Trigger>
          <Tabs.Trigger value="service" className={tabTriggerClass}>
            Serviços ({byType('service').length})
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="specialty"><SectionContent type="specialty" /></Tabs.Content>
        <Tabs.Content value="procedure"><SectionContent type="procedure" /></Tabs.Content>
        <Tabs.Content value="service"><SectionContent type="service" /></Tabs.Content>
      </Tabs.Root>

      {/* Dialog */}
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-background shadow-xl p-6">
            <Dialog.Title className="text-base font-semibold text-text-primary mb-4">
              {editing ? 'Editar item' : `Novo ${TYPE_LABELS[form.type]?.toLowerCase()}`}
            </Dialog.Title>

            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <FieldLabel
                label="Nome *"
                htmlFor="sp-name"
                description="Nome da especialidade ou procedimento"
                example="Ortopedista Joelho, Fisioterapia Pilates"
              >
                <input
                  id="sp-name"
                  name="name"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                  className={inputClass}
                />
              </FieldLabel>

              <FieldLabel label="Tipo" htmlFor="sp-type" description="Categoria do item" example="">
                <select
                  id="sp-type"
                  value={form.type}
                  onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as SpecialtyType }))}
                  className={inputClass}
                >
                  <option value="specialty">Especialidade</option>
                  <option value="procedure">Procedimento</option>
                  <option value="service">Serviço</option>
                </select>
              </FieldLabel>

              {contacts.length > 0 && (
                <FieldLabel
                  label="Contato responsável"
                  htmlFor="sp-contact"
                  description="Contato vinculado para escalação relacionada a este item"
                  example=""
                >
                  <select
                    id="sp-contact"
                    value={form.contact_id}
                    onChange={(e) => setForm((p) => ({ ...p, contact_id: e.target.value }))}
                    className={inputClass}
                  >
                    <option value="">Nenhum</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </FieldLabel>
              )}

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
                  {loading ? 'Salvando...' : editing ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
