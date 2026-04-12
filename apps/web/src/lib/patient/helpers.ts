import { UserCheck, Clock, UserX } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

export type PatientStatus = 'review' | 'active' | 'inactive'

// -----------------------------------------------------------------------
// Masks — input formatting (controlled inputs)
// -----------------------------------------------------------------------

export function maskCpf(value: string): string {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    .slice(0, 14)
}

export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 13)
  if (digits.length <= 2) return `+${digits}`
  if (digits.length <= 4) return `+${digits.slice(0, 2)} (${digits.slice(2)}`
  if (digits.length <= 9) return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4)}`
  return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`
}

// -----------------------------------------------------------------------
// Display formatters — read-only display
// -----------------------------------------------------------------------

export function displayCpf(cpf: string): string {
  const d = cpf.replace(/\D/g, '')
  if (d.length !== 11) return cpf
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

export function displayPhone(phone: string): string {
  const d = phone.replace(/\D/g, '')
  if (d.length === 13) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  return phone
}

// -----------------------------------------------------------------------
// Auth
// -----------------------------------------------------------------------

export async function getToken(): Promise<string> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? ''
}

// -----------------------------------------------------------------------
// Status config
// -----------------------------------------------------------------------

export const STATUS_CONFIG: Record<PatientStatus, { label: string; icon: typeof UserCheck; className: string }> = {
  review: { label: 'Aguardando revisão', icon: Clock, className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  active: { label: 'Ativo', icon: UserCheck, className: 'bg-green-50 text-green-700 border-green-200' },
  inactive: { label: 'Inativo', icon: UserX, className: 'bg-slate-100 text-slate-500 border-slate-200' },
}
