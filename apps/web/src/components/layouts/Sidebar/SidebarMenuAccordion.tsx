'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LucideIcon, ChevronDown } from 'lucide-react'
import * as Accordion from '@radix-ui/react-accordion'
import { cn } from '@/lib/utils'

interface SubItem {
  href: string
  label: string
}

interface SidebarMenuAccordionProps {
  label: string
  icon: LucideIcon
  items: SubItem[]
}

export function SidebarMenuAccordion({ label, icon: Icon, items }: SidebarMenuAccordionProps) {
  const pathname = usePathname()
  const isAnyActive = items.some((item) => pathname === item.href || pathname.startsWith(item.href + '/'))

  return (
    <Accordion.Root type="single" collapsible {...(isAnyActive ? { defaultValue: 'item' } : {})}>
      <Accordion.Item value="item">
        <Accordion.Trigger
          className={cn(
            'flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors border-l-2',
            'data-[state=open]:text-text-primary data-[state=closed]:text-text-secondary',
            isAnyActive
              ? 'bg-primary-lighter text-primary-dark border-primary'
              : 'hover:bg-surface hover:text-text-primary border-transparent',
            'group pl-[10px]'
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">{label}</span>
          <ChevronDown className="h-3.5 w-3.5 text-text-secondary transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </Accordion.Trigger>
        <Accordion.Content className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
          <div className="ml-6 mt-0.5 flex flex-col gap-0.5 border-l border-border pl-3">
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'block py-1.5 px-2 text-sm rounded-md transition-colors',
                    active
                      ? 'text-primary font-medium'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion.Root>
  )
}
