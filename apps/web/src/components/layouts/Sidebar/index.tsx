'use client'

import { LogOut } from 'lucide-react'
import { SidebarMenuItem } from './SidebarMenuItem'
import { SidebarMenuAccordion } from './SidebarMenuAccordion'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

export interface MenuItem {
  type: 'item'
  href: string
  label: string
  icon: LucideIcon
  badge?: string
}

export interface MenuAccordion {
  type: 'accordion'
  label: string
  icon: LucideIcon
  items: { href: string; label: string }[]
}

export type MenuEntry = MenuItem | MenuAccordion

interface SidebarProps {
  menuItems: MenuEntry[]
  userName?: string
  userRole?: string
  onLogout?: () => void
  className?: string
}

export function Sidebar({ menuItems, userName, userRole, onLogout, className }: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex h-full w-[260px] shrink-0 flex-col bg-surface border-r border-border',
        className
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 px-4 border-b border-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <span className="text-xs font-bold text-white">CRM</span>
        </div>
        <span className="text-sm font-semibold text-text-primary">Fidelização Clínicas</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 scrollbar-hide">
        <div className="flex flex-col gap-0.5">
          {menuItems.map((entry, index) => {
            if (entry.type === 'item') {
              return (
                <SidebarMenuItem
                  key={entry.href}
                  href={entry.href}
                  label={entry.label}
                  icon={entry.icon}
                  {...(entry.badge ? { badge: entry.badge } : {})}
                />
              )
            }
            return (
              <SidebarMenuAccordion
                key={index}
                label={entry.label}
                icon={entry.icon}
                items={entry.items}
              />
            )
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white text-xs font-semibold">
            {userName ? userName.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-text-primary truncate">{userName ?? 'Usuário'}</p>
            {userRole && (
              <p className="text-[10px] text-text-secondary truncate">{userRole}</p>
            )}
          </div>
          <button
            onClick={onLogout}
            className="ml-auto text-text-secondary hover:text-danger transition-colors"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
