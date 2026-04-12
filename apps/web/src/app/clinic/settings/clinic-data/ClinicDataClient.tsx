'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FieldLabel } from '@/components/ui/FieldLabel'
import { getToken } from '@/lib/patient/helpers'

interface TenantData {
  id: string
  name: string
  description: string | null
  services_description: string | null
  phone_contact: string | null
  waba_phone_number_id: string | null
  waba_access_token: string | null
  followup_inactivity_enabled: boolean
  followup_contextual_enabled: boolean
}

interface ClinicDataClientProps {
  tenant: TenantData
}

const inputClass =
  'rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow w-full'

export function ClinicDataClient({ tenant }: ClinicDataClientProps) {
  const router = useRouter()
  const [form, setForm] = useState({
    name: tenant.name,
    description: tenant.description ?? '',
    services_description: tenant.services_description ?? '',
    phone_contact: tenant.phone_contact ?? '',
    waba_phone_number_id: tenant.waba_phone_number_id ?? '',
    waba_access_token: tenant.waba_access_token ?? '',
    followup_inactivity_enabled: tenant.followup_inactivity_enabled,
    followup_contextual_enabled: tenant.followup_contextual_enabled,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setForm((prev) => ({ ...prev, [name]: checked }))
      return
    }
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const token = await getToken()
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/settings/clinic`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            name: form.name,
            description: form.description || null,
            services_description: form.services_description || null,
            phone_contact: form.phone_contact || null,
            waba_phone_number_id: form.waba_phone_number_id || null,
            waba_access_token: form.waba_access_token || null,
            followup_inactivity_enabled: form.followup_inactivity_enabled,
            followup_contextual_enabled: form.followup_contextual_enabled,
          }),
        },
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body?.error ?? `Erro ao salvar (${res.status})`)
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

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl flex flex-col gap-6">
      {/* Dados gerais */}
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-text-primary border-b border-border pb-2">
          Dados da Clínica
        </h2>

        <FieldLabel
          label="Nome da clínica *"
          htmlFor="cd-name"
          description="Nome exibido para os pacientes nas mensagens"
          example="Clínica Ortopédica São Lucas"
        >
          <input
            id="cd-name"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            className={inputClass}
          />
        </FieldLabel>

        <FieldLabel
          label="Descrição"
          htmlFor="cd-desc"
          description="Breve descrição da clínica"
          example="Especializada em ortopedia e fisioterapia há 15 anos"
        >
          <textarea
            id="cd-desc"
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={3}
            className={inputClass}
          />
        </FieldLabel>

        <FieldLabel
          label="Serviços"
          htmlFor="cd-services"
          description="Lista de serviços oferecidos (usada pela IA para contextualizar respostas)"
          example="Ortopedia, Fisioterapia, Acupuntura, Pilates clínico"
        >
          <textarea
            id="cd-services"
            name="services_description"
            value={form.services_description}
            onChange={handleChange}
            rows={3}
            className={inputClass}
          />
        </FieldLabel>

        <FieldLabel
          label="Telefone de contato"
          htmlFor="cd-phone"
          description="Número de contato geral da clínica"
          example="+55 (11) 3000-0000"
        >
          <input
            id="cd-phone"
            name="phone_contact"
            value={form.phone_contact}
            onChange={handleChange}
            inputMode="tel"
            className={inputClass}
          />
        </FieldLabel>
      </section>

      {/* WhatsApp Business */}
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-text-primary border-b border-border pb-2">
          Integração WhatsApp Business
        </h2>

        <FieldLabel
          label="WABA Phone Number ID"
          htmlFor="cd-waba-id"
          description="ID do número de telefone na Meta Business Platform. Encontre em: Meta for Developers → WhatsApp → Configuração"
          example="1234567890123456"
        >
          <input
            id="cd-waba-id"
            name="waba_phone_number_id"
            value={form.waba_phone_number_id}
            onChange={handleChange}
            className={inputClass}
            placeholder="Ex: 1234567890123456"
          />
        </FieldLabel>

        <FieldLabel
          label="WABA Access Token"
          htmlFor="cd-waba-token"
          description="Token permanente de acesso à API do WhatsApp Cloud. Gerado em Meta for Developers → System Users"
          example="EAABz..."
        >
          <input
            id="cd-waba-token"
            name="waba_access_token"
            type="password"
            value={form.waba_access_token}
            onChange={handleChange}
            className={inputClass}
            placeholder="EAABz..."
          />
        </FieldLabel>
      </section>

      {/* Follow-ups */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text-primary border-b border-border pb-2">
          Follow-ups Automáticos
        </h2>

        <div className="flex items-start justify-between rounded-lg border border-border bg-surface px-4 py-3">
          <div>
            <p className="text-sm font-medium text-text-primary">FUP por inatividade</p>
            <p className="text-xs text-text-secondary mt-0.5">
              Envia mensagem automática quando o paciente fica sem contato por X dias
            </p>
          </div>
          <input
            type="checkbox"
            id="cd-fup-inactivity"
            name="followup_inactivity_enabled"
            checked={form.followup_inactivity_enabled}
            onChange={handleChange}
            className="h-4 w-4 mt-1 rounded border-border text-primary focus:ring-primary shrink-0"
          />
        </div>

        <div className="flex items-start justify-between rounded-lg border border-border bg-surface px-4 py-3">
          <div>
            <p className="text-sm font-medium text-text-primary">FUP contextual</p>
            <p className="text-xs text-text-secondary mt-0.5">
              Baseado nos documentos e interações do paciente (medicamentos, exames, retornos)
            </p>
          </div>
          <input
            type="checkbox"
            id="cd-fup-contextual"
            name="followup_contextual_enabled"
            checked={form.followup_contextual_enabled}
            onChange={handleChange}
            className="h-4 w-4 mt-1 rounded border-border text-primary focus:ring-primary shrink-0"
          />
        </div>
      </section>

      {error && (
        <p className="text-sm text-danger bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-success bg-green-50 border border-green-200 rounded-md px-3 py-2">
          Configurações salvas com sucesso.
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Salvando...' : 'Salvar configurações'}
        </button>
      </div>
    </form>
  )
}
