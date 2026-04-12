export type UserRole = 'super_admin' | 'admin' | 'secretary'
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
