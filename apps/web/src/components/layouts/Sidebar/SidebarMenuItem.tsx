'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarMenuItemProps {
  href: string
  label: string
  icon: LucideIcon
  badge?: string
}

export function SidebarMenuItem({ href, label, icon: Icon, badge }: SidebarMenuItemProps) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors relative',
        isActive
          ? 'bg-primary-lighter text-primary-dark border-l-2 border-primary pl-[10px]'
          : 'text-text-secondary hover:bg-surface hover:text-text-primary border-l-2 border-transparent pl-[10px]'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="text-[10px] font-semibold bg-primary-lighter text-primary-dark px-1.5 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </Link>
  )
}
