'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Building2, CheckCircle, XCircle, Pencil } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { createClient } from '@/lib/supabase/client'

interface Tenant {
  id: string
  name: string
  description: string | null
  phone_contact: string | null
  status: string
  billing_status: string | null
  plans: { name: string } | null
  created_at: string
}

interface ClinicsClientProps {
  initialTenants: Tenant[]
}

export function ClinicsClient({ initialTenants }: ClinicsClientProps) {
  const router = useRouter()
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    description: '',
    phone_contact: '',
    admin_email: '',
    admin_name: '',
    admin_password: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/tenants`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token ?? ''}`,
          },
          body: JSON.stringify(form),
        },
      )

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body?.error?.message ?? `Erro ao criar clínica (${res.status})`)
        return
      }

      const { data } = await res.json()
      setTenants((prev) => [data.tenant, ...prev])
      setOpen(false)
      setForm({ name: '', description: '', phone_contact: '', admin_email: '', admin_name: '', admin_password: '' })
      router.refresh()
    } catch {
      setError('Erro de conexão. Verifique se a API está rodando.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Header da lista */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-text-secondary">
          {tenants.length} {tenants.length === 1 ? 'clínica' : 'clínicas'} cadastradas
        </p>
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger asChild>
            <button className="flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-dark transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
              <Plus className="h-4 w-4" />
              Nova Clínica
            </button>
          </Dialog.Trigger>

          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
            <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-white p-6 shadow-lg">
              <Dialog.Title className="text-base font-semibold text-text-primary mb-4">
                Nova Clínica
              </Dialog.Title>

              <form onSubmit={handleCreate} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4">
                  <Field label="Nome da Clínica *" htmlFor="name">
                    <input id="name" name="name" value={form.name} onChange={handleChange} required placeholder="Ex: Clínica Saúde Integral" className={inputClass} />
                  </Field>
                  <Field label="Descrição" htmlFor="description">
                    <textarea id="description" name="description" value={form.description} onChange={handleChange} rows={2} placeholder="Especialidades e diferenciais..." className={`${inputClass} resize-none`} />
                  </Field>
                  <Field label="Telefone" htmlFor="phone_contact">
                    <input id="phone_contact" name="phone_contact" value={form.phone_contact} onChange={handleChange} placeholder="(11) 3000-0000" className={inputClass} />
                  </Field>
                </div>

                <hr className="border-border" />
                <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Usuário Admin Inicial</p>

                <div className="grid grid-cols-1 gap-4">
                  <Field label="Nome *" htmlFor="admin_name">
                    <input id="admin_name" name="admin_name" value={form.admin_name} onChange={handleChange} required placeholder="Dr. João Silva" className={inputClass} />
                  </Field>
                  <Field label="Email *" htmlFor="admin_email">
                    <input id="admin_email" name="admin_email" type="email" value={form.admin_email} onChange={handleChange} required placeholder="admin@clinica.com" className={inputClass} />
                  </Field>
                  <Field label="Senha temporária *" htmlFor="admin_password">
                    <input id="admin_password" name="admin_password" type="password" value={form.admin_password} onChange={handleChange} required minLength={8} placeholder="Mínimo 8 caracteres" className={inputClass} />
                  </Field>
                </div>

                {error && (
                  <p className="text-sm text-danger bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
                )}

                <div className="flex justify-end gap-2 mt-2">
                  <Dialog.Close asChild>
                    <button type="button" className="rounded-md px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary border border-border hover:bg-surface transition-colors">
                      Cancelar
                    </button>
                  </Dialog.Close>
                  <button type="submit" disabled={loading} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50 transition-colors">
                    {loading ? 'Criando...' : 'Criar Clínica'}
                  </button>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      {/* Tabela */}
      {tenants.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
          <Building2 className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm">Nenhuma clínica cadastrada.</p>
          <p className="text-xs mt-1">Clique em &ldquo;Nova Clínica&rdquo; para começar.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="px-4 py-3 text-left font-medium text-text-secondary">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary hidden md:table-cell">Telefone</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary hidden lg:table-cell">Plano</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">Status</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">Cadastro</th>
                <th className="px-4 py-3 text-right font-medium text-text-secondary">Ação</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-text-primary">{tenant.name}</p>
                      {tenant.description && (
                        <p className="text-xs text-text-secondary truncate max-w-[240px]">{tenant.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-secondary hidden md:table-cell">
                    {tenant.phone_contact ?? '—'}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {tenant.plans?.name ? (
                      <span className="inline-flex items-center rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                        {tenant.plans.name}
                      </span>
                    ) : (
                      <span className="text-text-secondary opacity-50">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {tenant.status === 'active' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                        <CheckCircle className="h-3 w-3" /> Ativa
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                        <XCircle className="h-3 w-3" /> Inativa
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {new Date(tenant.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => router.push(`/admin/clinics/${tenant.id}`)}
                      className="inline-flex items-center gap-1 rounded px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary-lighter transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </button>
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

// -----------------------------------------------------------------------
// Pequeno helper de field label
// -----------------------------------------------------------------------
function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-xs font-medium text-text-primary">{label}</label>
      {children}
    </div>
  )
}

const inputClass =
  'rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow w-full'
