// 'external_integration' is runtime-only (API key callers) — never stored in DB
export type UserRole = 'super_admin' | 'admin' | 'secretary' | 'external_integration'
export type UserStatus = 'active' | 'inactive'

export interface User {
  id: string
  tenant_id: string | null
  email: string
  name: string
  role: UserRole
  status: UserStatus
  created_at: string
  updated_at: string
}
