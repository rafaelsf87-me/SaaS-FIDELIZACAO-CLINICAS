'use client'

import { useState, useRef } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import { createClient } from '@/lib/supabase/client'
import { FieldLabel } from '@/components/ui/FieldLabel'
import { FieldGuide } from '@/components/ui/FieldGuide'
import { Plus, Trash2, CheckCircle, XCircle } from 'lucide-react'

async function getToken(): Promise<string> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? ''
}

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

interface Tenant {
  id: string
  name: string
  logo_url: string | null
  description: string | null
  services_description: string | null
  phone_contact: string | null
  waba_phone_number_id: string | null
  waba_access_token: string | null
  followup_inactivity_enabled: boolean
  followup_contextual_enabled: boolean
  status: string
}

interface Contact {
  id: string
  label: string
  phone_number: string | null
  whatsapp_number: string | null
  scope_description: string | null
  is_default: boolean
  active: boolean
}

interface Specialty {
  id: string
  name: string
  type: string
  active: boolean
}

interface ClinicEditClientProps {
  tenant: Tenant
  initialContacts: Contact[]
  initialSpecialties: Specialty[]
}

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

const inputClass =
  'rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow w-full'

const WABA_STEPS: [{ title: string; description: string }, ...{ title: string; description: string }[]] = [
  { title: 'Acesse o Meta Business Suite', description: 'Vá em business.facebook.com e faça login com a conta associada ao WABA.' },
  { title: 'Abra Configurações do WhatsApp', description: 'No menu lateral, clique em "Configurações" → "WhatsApp Business".' },
  { title: 'Copie o Phone Number ID', description: 'Na aba "Números de telefone", copie o campo "ID do número de telefone".' },
  { title: 'Gere um Access Token permanente', description: 'Em "Configurações do sistema" → "Usuários do sistema", gere um token com permissão whatsapp_business_messaging.' },
]

// -----------------------------------------------------------------------
// Tab: Dados
// -----------------------------------------------------------------------

function DadosTab({ tenant }: { tenant: Tenant }) {
  const [form, setForm] = useState({
    name: tenant.name,
    description: tenant.description ?? '',
    services_description: tenant.services_description ?? '',
    phone_contact: tenant.phone_contact ?? '',
    waba_phone_number_id: tenant.waba_phone_number_id ?? '',
    waba_access_token: tenant.waba_access_token ?? '',
    followup_inactivity_enabled: tenant.followup_inactivity_enabled,
    followup_contextual_enabled: tenant.followup_contextual_enabled,
    status: tenant.status,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(tenant.logo_url)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoError, setLogoError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 200 * 1024) {
      setLogoError('Logo deve ter no máximo 200KB.')
      return
    }
    setLogoError(null)
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      let logoUrl = tenant.logo_url
      if (logoFile) {
        const ext = logoFile.name.split('.').pop()
        const path = `tenants/${tenant.id}/logo.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('tenant-assets')
          .upload(path, logoFile, { upsert: true })
        if (uploadError) {
          setError('Erro ao fazer upload do logo.')
          return
        }
        const { data: urlData } = supabase.storage.from('tenant-assets').getPublicUrl(path)
        logoUrl = urlData.publicUrl
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/tenants/${tenant.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token ?? ''}`,
          },
          body: JSON.stringify({ ...form, logo_url: logoUrl }),
        },
      )

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body?.error?.message ?? `Erro ao salvar (${res.status})`)
        return
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Erro de conexão.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-5 max-w-2xl">
      {/* Logo */}
      <div className="flex flex-col gap-1.5">
        <FieldLabel
          label="Logo da Clínica"
          description="Imagem exibida no painel e nas comunicações. Formatos: PNG, JPG, SVG."
          example="logotipo_clinica.png"
        />
        <div className="flex items-center gap-4">
          {logoPreview ? (
            <img src={logoPreview} alt="Logo" className="h-14 w-14 rounded-lg object-cover border border-border" />
          ) : (
            <div className="h-14 w-14 rounded-lg border border-dashed border-border flex items-center justify-center text-text-secondary text-xs">Logo</div>
          )}
          <div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
            <button type="button" onClick={() => fileRef.current?.click()} className="text-sm text-primary hover:underline">
              {logoPreview ? 'Trocar logo' : 'Enviar logo'}
            </button>
            <p className="text-xs text-text-secondary mt-0.5">Máximo 200KB</p>
            {logoError && <p className="text-xs text-danger mt-0.5">{logoError}</p>}
          </div>
        </div>
      </div>

      {/* Nome */}
      <div className="flex flex-col gap-1.5">
        <FieldLabel label="Nome da Clínica" description="Nome oficial exibido no sistema e nas mensagens." example="Clínica Saúde Integral" required />
        <input name="name" value={form.name} onChange={handleChange} required className={inputClass} />
      </div>

      {/* Descrição */}
      <div className="flex flex-col gap-1.5">
        <FieldLabel label="Descrição" description="Apresentação geral da clínica para contexto da IA." example="Clínica especializada em ortopedia com atendimento humanizado." />
        <textarea name="description" value={form.description} onChange={handleChange} rows={3} className={`${inputClass} resize-none`} />
      </div>

      {/* Serviços */}
      <div className="flex flex-col gap-1.5">
        <FieldLabel label="Serviços Oferecidos" description="Lista de especialidades e procedimentos para a IA usar nas mensagens contextuais." example="Ortopedia, Fisioterapia, Acupuntura" />
        <textarea name="services_description" value={form.services_description} onChange={handleChange} rows={2} className={`${inputClass} resize-none`} />
      </div>

      {/* Telefone */}
      <div className="flex flex-col gap-1.5">
        <FieldLabel label="Telefone de Contato" description="Número principal exibido nas comunicações com pacientes." example="(11) 3000-0000" />
        <input name="phone_contact" value={form.phone_contact} onChange={handleChange} placeholder="(11) 3000-0000" className={inputClass} />
      </div>

      {/* WhatsApp Business */}
      <div className="border-t border-border pt-5">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-sm font-semibold text-text-primary">WhatsApp Business API</h3>
          <FieldGuide title="Como configurar o WhatsApp Business API" steps={WABA_STEPS} />
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <FieldLabel
              label="Phone Number ID"
              description="Identificador do número de telefone no Meta Business. Encontrado em Configurações → WhatsApp → Números de telefone."
              example="123456789012345"
              required
            />
            <input name="waba_phone_number_id" value={form.waba_phone_number_id} onChange={handleChange} placeholder="123456789012345" className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <FieldLabel
              label="Access Token"
              description="Token de acesso permanente gerado no Meta Business. Será criptografado via Supabase Vault antes do go-live."
              example="EAABs..."
              required
            />
            <input name="waba_access_token" type="password" value={form.waba_access_token} onChange={handleChange} placeholder="EAABs..." className={inputClass} />
          </div>
        </div>
      </div>

      {/* Follow-up */}
      <div className="border-t border-border pt-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Follow-up</h3>
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" name="followup_inactivity_enabled" checked={form.followup_inactivity_enabled} onChange={handleChange} className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
            <div>
              <p className="text-sm font-medium text-text-primary">Follow-up por inatividade</p>
              <p className="text-xs text-text-secondary">Mensagens automáticas quando paciente fica sem interação por N dias</p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" name="followup_contextual_enabled" checked={form.followup_contextual_enabled} onChange={handleChange} className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
            <div>
              <p className="text-sm font-medium text-text-primary">Follow-up contextual</p>
              <p className="text-xs text-text-secondary">Mensagens baseadas em documentos do paciente (medicamentos, exames, retornos)</p>
            </div>
          </label>
        </div>
      </div>

      {/* Status */}
      <div className="flex flex-col gap-1.5">
        <FieldLabel label="Status" description="Clínicas inativas não recebem mensagens e ficam ocultas no sistema." />
        <select name="status" value={form.status} onChange={handleChange} className={inputClass}>
          <option value="active">Ativa</option>
          <option value="inactive">Inativa</option>
        </select>
      </div>

      {error && (
        <p className="text-sm text-danger bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
      )}
      {saved && (
        <p className="text-sm text-success bg-green-50 border border-green-200 rounded px-3 py-2">Salvo com sucesso.</p>
      )}

      <div className="flex justify-end pt-2">
        <button type="submit" disabled={saving} className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50 transition-colors">
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>
    </form>
  )
}

// -----------------------------------------------------------------------
// Tab: Contatos
// -----------------------------------------------------------------------

function ContactsTab({ tenantId, initialContacts }: { tenantId: string; initialContacts: Contact[] }) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts)
  const [form, setForm] = useState({ label: '', phone_number: '', whatsapp_number: '', scope_description: '', is_default: false })
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/tenants/${tenantId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await getToken()}` },
        body: JSON.stringify(form),
      })
      if (!res.ok) { setError('Erro ao adicionar contato.'); return }
      const { data } = await res.json()
      setContacts((prev) => [...prev, data])
      setForm({ label: '', phone_number: '', whatsapp_number: '', scope_description: '', is_default: false })
      setAdding(false)
    } catch { setError('Erro de conexão.') }
    finally { setLoading(false) }
  }

  async function handleDelete(contactId: string) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/tenants/${tenantId}/contacts/${contactId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${await getToken()}` },
    })
    if (res.ok) setContacts((prev) => prev.filter((c) => c.id !== contactId))
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-text-secondary">{contacts.length} contato(s)</p>
        <button onClick={() => setAdding((v) => !v)} className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
          <Plus className="h-4 w-4" /> Adicionar contato
        </button>
      </div>

      {adding && (
        <form onSubmit={handleAdd} className="border border-border rounded-lg p-4 mb-4 flex flex-col gap-3 bg-surface">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Label *" htmlFor="c-label">
              <input id="c-label" value={form.label} onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))} required placeholder="Ortopedia" className={inputClass} />
            </Field>
            <Field label="Telefone" htmlFor="c-phone">
              <input id="c-phone" value={form.phone_number ?? ''} onChange={(e) => setForm((p) => ({ ...p, phone_number: e.target.value }))} placeholder="(11) 3000-0000" className={inputClass} />
            </Field>
            <Field label="WhatsApp" htmlFor="c-wa">
              <input id="c-wa" value={form.whatsapp_number ?? ''} onChange={(e) => setForm((p) => ({ ...p, whatsapp_number: e.target.value }))} placeholder="+55 11 90000-0000" className={inputClass} />
            </Field>
            <Field label="Escopo" htmlFor="c-scope">
              <input id="c-scope" value={form.scope_description ?? ''} onChange={(e) => setForm((p) => ({ ...p, scope_description: e.target.value }))} placeholder="Escalações de ortopedia" className={inputClass} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
            <input type="checkbox" checked={form.is_default} onChange={(e) => setForm((p) => ({ ...p, is_default: e.target.checked }))} className="h-4 w-4 rounded border-border text-primary" />
            Contato padrão
          </label>
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setAdding(false)} className="text-sm text-text-secondary hover:text-text-primary">Cancelar</button>
            <button type="submit" disabled={loading} className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50">{loading ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-2">
        {contacts.length === 0 && <p className="text-sm text-text-secondary py-6 text-center">Nenhum contato cadastrado.</p>}
        {contacts.map((c) => (
          <div key={c.id} className="flex items-start justify-between rounded-lg border border-border p-3 bg-background">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-text-primary">{c.label}</p>
                {c.is_default && <span className="rounded-full bg-primary-lighter px-2 py-0.5 text-[10px] font-medium text-primary">padrão</span>}
              </div>
              {c.phone_number && <p className="text-xs text-text-secondary">{c.phone_number}</p>}
              {c.whatsapp_number && <p className="text-xs text-text-secondary">WA: {c.whatsapp_number}</p>}
              {c.scope_description && <p className="text-xs text-text-secondary italic">{c.scope_description}</p>}
            </div>
            <button onClick={() => handleDelete(c.id)} className="text-text-secondary hover:text-danger transition-colors ml-2 mt-0.5">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------
// Tab: Especialidades
// -----------------------------------------------------------------------

function SpecialtiesTab({ tenantId, initialSpecialties }: { tenantId: string; initialSpecialties: Specialty[] }) {
  const [specialties, setSpecialties] = useState<Specialty[]>(initialSpecialties)
  const [form, setForm] = useState({ name: '', type: 'specialty' as const })
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/tenants/${tenantId}/specialties`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await getToken()}` },
        body: JSON.stringify(form),
      })
      if (!res.ok) { setError('Erro ao adicionar especialidade.'); return }
      const { data } = await res.json()
      setSpecialties((prev) => [...prev, data])
      setForm({ name: '', type: 'specialty' })
      setAdding(false)
    } catch { setError('Erro de conexão.') }
    finally { setLoading(false) }
  }

  async function handleDelete(specId: string) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/tenants/${tenantId}/specialties/${specId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${await getToken()}` },
    })
    if (res.ok) setSpecialties((prev) => prev.filter((s) => s.id !== specId))
  }

  const typeLabel: Record<string, string> = { specialty: 'Especialidade', procedure: 'Procedimento', service: 'Serviço' }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-text-secondary">{specialties.length} item(ns)</p>
        <button onClick={() => setAdding((v) => !v)} className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
          <Plus className="h-4 w-4" /> Adicionar
        </button>
      </div>

      {adding && (
        <form onSubmit={handleAdd} className="border border-border rounded-lg p-4 mb-4 flex flex-col gap-3 bg-surface">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nome *" htmlFor="s-name">
              <input id="s-name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required placeholder="Ortopedia" className={inputClass} />
            </Field>
            <Field label="Tipo" htmlFor="s-type">
              <select id="s-type" value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as typeof form.type }))} className={inputClass}>
                <option value="specialty">Especialidade</option>
                <option value="procedure">Procedimento</option>
                <option value="service">Serviço</option>
              </select>
            </Field>
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setAdding(false)} className="text-sm text-text-secondary hover:text-text-primary">Cancelar</button>
            <button type="submit" disabled={loading} className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50">{loading ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-lg border border-border">
        {specialties.length === 0 ? (
          <p className="text-sm text-text-secondary py-6 text-center">Nenhuma especialidade cadastrada.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="px-4 py-3 text-left font-medium text-text-secondary">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">Tipo</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {specialties.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-text-primary">{s.name}</td>
                  <td className="px-4 py-3 text-text-secondary">{typeLabel[s.type] ?? s.type}</td>
                  <td className="px-4 py-3">
                    {s.active
                      ? <span className="inline-flex items-center gap-1 text-xs text-green-700"><CheckCircle className="h-3 w-3" /> Ativa</span>
                      : <span className="inline-flex items-center gap-1 text-xs text-gray-400"><XCircle className="h-3 w-3" /> Inativa</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(s.id)} className="text-text-secondary hover:text-danger transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
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

// -----------------------------------------------------------------------
// Root component
// -----------------------------------------------------------------------

export function ClinicEditClient({ tenant, initialContacts, initialSpecialties }: ClinicEditClientProps) {
  return (
    <Tabs.Root defaultValue="dados">
      <Tabs.List className="flex border-b border-border mb-6 gap-1">
        {(['dados', 'contatos', 'especialidades'] as const).map((tab) => (
          <Tabs.Trigger
            key={tab}
            value={tab}
            className="px-4 py-2 text-sm font-medium text-text-secondary capitalize data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:-mb-px transition-colors hover:text-text-primary focus:outline-none"
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      <Tabs.Content value="dados">
        <DadosTab tenant={tenant} />
      </Tabs.Content>

      <Tabs.Content value="contatos">
        <ContactsTab tenantId={tenant.id} initialContacts={initialContacts} />
      </Tabs.Content>

      <Tabs.Content value="especialidades">
        <SpecialtiesTab tenantId={tenant.id} initialSpecialties={initialSpecialties} />
      </Tabs.Content>
    </Tabs.Root>
  )
}

// -----------------------------------------------------------------------
// Local Field helper
// -----------------------------------------------------------------------
function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-xs font-medium text-text-primary">{label}</label>
      {children}
    </div>
  )
}
