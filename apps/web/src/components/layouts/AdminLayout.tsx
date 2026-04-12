'use client'

import {
  LayoutDashboard,
  Building2,
  CalendarClock,
  Tag,
  BarChart3,
  FileSearch,
  Settings,
} from 'lucide-react'
import { Sidebar, MenuEntry } from './Sidebar'
import { PageHeader } from './PageHeader'

const ADMIN_MENU: MenuEntry[] = [
  { type: 'item', href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { type: 'item', href: '/admin/clinics', label: 'Clínicas', icon: Building2 },
  { type: 'item', href: '/admin/scenarios', label: 'Cenários FUP', icon: CalendarClock },
  { type: 'item', href: '/admin/keywords', label: 'Keywords', icon: Tag },
  { type: 'item', href: '/admin/usage', label: 'Usage', icon: BarChart3 },
  { type: 'item', href: '/admin/audit', label: 'Auditoria', icon: FileSearch },
  { type: 'item', href: '/admin/settings', label: 'Configurações', icon: Settings },
]

interface AdminLayoutProps {
  children: React.ReactNode
  title: string
  breadcrumb?: string[]
}

export function AdminLayout({ children, title, breadcrumb }: AdminLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* TODO(Etapa 3): substituir userName/userRole por dados reais do usuário autenticado */}
      <Sidebar
        menuItems={ADMIN_MENU}
        userName="Super Admin"
        userRole="Administrador"
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <PageHeader title={title} {...(breadcrumb ? { breadcrumb } : {})} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
