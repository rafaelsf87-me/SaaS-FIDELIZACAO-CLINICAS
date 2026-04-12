import {
  LayoutDashboard,
  Building2,
  CalendarClock,
  Tag,
  BarChart3,
  FileSearch,
  Settings,
} from 'lucide-react'
import { AuthenticatedSidebar } from '@/components/layouts/AuthenticatedSidebar'
import type { MenuEntry } from '@/components/layouts/Sidebar'

const ADMIN_MENU: MenuEntry[] = [
  { type: 'item', href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { type: 'item', href: '/admin/clinics', label: 'Clínicas', icon: Building2 },
  { type: 'item', href: '/admin/scenarios', label: 'Cenários FUP', icon: CalendarClock },
  { type: 'item', href: '/admin/keywords', label: 'Keywords', icon: Tag },
  { type: 'item', href: '/admin/usage', label: 'Usage', icon: BarChart3 },
  { type: 'item', href: '/admin/audit', label: 'Auditoria', icon: FileSearch },
  { type: 'item', href: '/admin/settings', label: 'Configurações', icon: Settings },
]

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AuthenticatedSidebar menuItems={ADMIN_MENU} />
      <div className="flex flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  )
}
