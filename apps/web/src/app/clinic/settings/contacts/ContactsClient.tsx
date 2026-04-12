'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Star } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { FieldLabel } from '@/components/ui/FieldLabel'
import { getToken } from '@/lib/patient/helpers'

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

interface Contact {
  id: string
  label: string
  phone_number: string | null
  whatsapp_number: string | null
  scope_description: string | null
  is_default: boolean
  active: boolean
}

interface ContactsClientProps {
  initialContacts: Contact[]
}

const inputClass =
  'rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow w-full'

const emptyForm = {
  label: '',
  phone_number: '',
  whatsapp_number: '',
  scope_description: '',
  is_default: false,
}

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------

export function ContactsClient({ initialContacts }: ContactsClientProps) {
  const router = useRouter()
  const [contacts, setContacts] = useState<Contact[]>(initialContacts)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Contact | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setError(null)
    setOpen(true)
  }

  function openEdit(contact: Contact) {
    setEditing(contact)
    setForm({
      label: contact.label,
      phone_number: contact.phone_number ?? '',
      whatsapp_number: contact.whatsapp_number ?? '',
      scope_description: contact.scope_description ?? '',
      is_default: contact.is_default,
    })
    setError(null)
    setOpen(true)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setForm((prev) => ({ ...prev, [name]: checked }))
      return
    }
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      const url = editing
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1/settings/contacts/${editing.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/v1/settings/contacts`
      const method = editing ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          label: form.label,
          phone_number: form.phone_number || null,
          whatsapp_number: form.whatsapp_number || null,
          scope_description: form.scope_description || null,
          is_default: form.is_default,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body?.error ?? `Erro (${res.status})`)
        return
      }

      const { data } = await res.json()
      if (editing) {
        setContacts((prev) =>
          prev.map((c) =>
            c.id === editing.id ? data : form.is_default ? { ...c, is_default: false } : c,
          ),
        )
      } else {
        if (form.is_default) {
          setContacts((prev) => [...prev.map((c) => ({ ...c, is_default: false })), data])
        } else {
          setContacts((prev) => [...prev, data])
        }
      }
      setOpen(false)
      router.refresh()
    } catch {
      setError('Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(contactId: string) {
    try {
      const token = await getToken()
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/settings/contacts/${contactId}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
      )
      if (res.ok) {
        setContacts((prev) => prev.filter((c) => c.id !== contactId))
        router.refresh()
      }
    } catch {
      // silent — user can refresh
    }
  }

  return (
    <div className="max-w-3xl flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          {contacts.length} contato{contacts.length !== 1 ? 's' : ''} cadastrado{contacts.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
        >
          <Plus className="h-4 w-4" />
          Novo Contato
        </button>
      </div>

      {contacts.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-8 flex flex-col items-center gap-2 text-center">
          <p className="text-sm text-text-secondary">Nenhum contato cadastrado.</p>
          <p className="text-xs text-text-secondary opacity-60">
            Adicione contatos para configurar escalações por especialidade.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="flex items-start justify-between rounded-lg border border-border bg-background px-4 py-3"
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-text-primary">{contact.label}</span>
                  {contact.is_default && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                      <Star className="h-3 w-3 fill-current" />
                      Padrão
                    </span>
                  )}
                  {!contact.active && (
                    <span className="text-xs text-text-secondary opacity-60">(inativo)</span>
                  )}
                </div>
                {contact.phone_number && (
                  <p className="text-xs text-text-secondary">Tel: {contact.phone_number}</p>
                )}
                {contact.whatsapp_number && (
                  <p className="text-xs text-text-secondary">WhatsApp: {contact.whatsapp_number}</p>
                )}
                {contact.scope_description && (
                  <p className="text-xs text-text-secondary italic">{contact.scope_description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                <button
                  onClick={() => openEdit(contact)}
                  className="rounded p-1.5 text-text-secondary hover:bg-surface hover:text-text-primary transition-colors"
                  aria-label={`Editar ${contact.label}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <AlertDialog.Root>
                  <AlertDialog.Trigger asChild>
                    <button
                      className="rounded p-1.5 text-text-secondary hover:bg-red-50 hover:text-danger transition-colors"
                      aria-label={`Remover ${contact.label}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </AlertDialog.Trigger>
                  <AlertDialog.Portal>
                    <AlertDialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
                    <AlertDialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100vw-2rem)] max-w-md rounded-xl bg-background shadow-xl p-6">
                      <AlertDialog.Title className="text-base font-semibold text-text-primary mb-2">
                        Remover contato
                      </AlertDialog.Title>
                      <AlertDialog.Description className="text-sm text-text-secondary mb-5">
                        Tem certeza que deseja remover <strong>{contact.label}</strong>?
                      </AlertDialog.Description>
                      <div className="flex justify-end gap-3">
                        <AlertDialog.Cancel asChild>
                          <button className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface transition-colors">
                            Cancelar
                          </button>
                        </AlertDialog.Cancel>
                        <AlertDialog.Action asChild>
                          <button
                            onClick={() => handleDelete(contact.id)}
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
          ))}
        </div>
      )}

      {/* Dialog criar/editar */}
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-background shadow-xl p-6">
            <Dialog.Title className="text-base font-semibold text-text-primary mb-4">
              {editing ? 'Editar contato' : 'Novo contato'}
            </Dialog.Title>

            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <FieldLabel
                label="Nome identificador *"
                htmlFor="ct-label"
                description="Nome interno para identificar este contato"
                example="Secretária Ortopedia"
              >
                <input
                  id="ct-label"
                  name="label"
                  value={form.label}
                  onChange={handleChange}
                  required
                  className={inputClass}
                />
              </FieldLabel>

              <FieldLabel
                label="Telefone"
                htmlFor="ct-phone"
                description="Número de telefone fixo"
                example="+55 (11) 3000-0000"
              >
                <input
                  id="ct-phone"
                  name="phone_number"
                  value={form.phone_number}
                  onChange={handleChange}
                  inputMode="tel"
                  className={inputClass}
                />
              </FieldLabel>

              <FieldLabel
                label="WhatsApp"
                htmlFor="ct-wa"
                description="Número de WhatsApp para escalação"
                example="+55 (11) 99999-0000"
              >
                <input
                  id="ct-wa"
                  name="whatsapp_number"
                  value={form.whatsapp_number}
                  onChange={handleChange}
                  inputMode="tel"
                  className={inputClass}
                />
              </FieldLabel>

              <FieldLabel
                label="Escopo"
                htmlFor="ct-scope"
                description="Descreva quando este contato deve ser acionado"
                example="Urgências ortopédicas e dúvidas pós-cirurgia"
              >
                <textarea
                  id="ct-scope"
                  name="scope_description"
                  value={form.scope_description}
                  onChange={handleChange}
                  rows={2}
                  className={inputClass}
                />
              </FieldLabel>

              <div className="flex items-center gap-2">
                <input
                  id="ct-default"
                  name="is_default"
                  type="checkbox"
                  checked={form.is_default}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="ct-default" className="text-sm text-text-primary cursor-pointer">
                  Contato padrão (único permitido)
                </label>
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
                  {loading ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar contato'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
