'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Sidebar } from './Sidebar'
import type { MenuEntry } from './Sidebar'

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrador da Clínica',
  secretary: 'Secretária',
}

interface AuthenticatedSidebarProps {
  menuItems: MenuEntry[]
}

/**
 * Wrapper client do Sidebar que busca o usuário autenticado via Supabase
 * e injeta userName, userRole e onLogout.
 * Usar nos layouts /admin e /clinic em substituição ao Sidebar direto.
 */
export function AuthenticatedSidebar({ menuItems }: AuthenticatedSidebarProps) {
  const router = useRouter()
  const [userName, setUserName] = useState('...')
  const [userRole, setUserRole] = useState('')

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('users')
        .select('name, role')
        .eq('id', user.id)
        .single<{ name: string; role: string }>()

      if (profile) {
        setUserName(profile.name)
        setUserRole(ROLE_LABEL[profile.role] ?? profile.role)
      }
    }
    loadUser()
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <Sidebar
      menuItems={menuItems}
      userName={userName}
      userRole={userRole}
      onLogout={handleLogout}
    />
  )
}
