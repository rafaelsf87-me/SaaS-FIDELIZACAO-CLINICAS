import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Settings,
  Megaphone,
} from 'lucide-react'
import { Sidebar } from '@/components/layouts/Sidebar'
import type { MenuEntry } from '@/components/layouts/Sidebar'

const CLINIC_MENU: MenuEntry[] = [
  { type: 'item', href: '/clinic/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { type: 'item', href: '/clinic/patients', label: 'Pacientes', icon: Users },
  { type: 'item', href: '/clinic/conversations', label: 'Conversas', icon: MessageSquare },
  {
    type: 'accordion',
    label: 'Configurações',
    icon: Settings,
    items: [
      { href: '/clinic/settings/clinic-data', label: 'Dados da Clínica' },
      { href: '/clinic/settings/specialties', label: 'Especialidades/Serviços' },
      { href: '/clinic/settings/contacts', label: 'Contatos' },
      { href: '/clinic/settings/followup', label: 'Follow-up' },
      { href: '/clinic/settings/keywords', label: 'Keywords' },
    ],
  },
  {
    type: 'item',
    href: '/clinic/campaigns',
    label: 'Campanhas',
    icon: Megaphone,
    badge: 'Em breve',
  },
]

export default function ClinicRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* TODO(Etapa 3): substituir userName/userRole por dados reais do usuário autenticado */}
      <Sidebar menuItems={CLINIC_MENU} userName="Dr. Rafael" userRole="Administrador da Clínica" />
      <div className="flex flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  )
}
