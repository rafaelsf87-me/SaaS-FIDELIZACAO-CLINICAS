import { ChevronRight } from 'lucide-react'

interface PageHeaderProps {
  title: string
  breadcrumb?: string[]
}

export function PageHeader({ title, breadcrumb }: PageHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-background px-6">
      {breadcrumb && breadcrumb.length > 0 && (
        <nav className="flex items-center gap-1 text-sm text-text-secondary">
          {breadcrumb.map((crumb, index) => (
            <span key={index} className="flex items-center gap-1">
              {index > 0 && <ChevronRight className="h-3.5 w-3.5" />}
              <span className={index === breadcrumb.length - 1 ? 'text-text-primary font-medium' : ''}>
                {crumb}
              </span>
            </span>
          ))}
        </nav>
      )}
      {(!breadcrumb || breadcrumb.length === 0) && (
        <h1 className="text-base font-semibold text-text-primary">{title}</h1>
      )}
    </header>
  )
}
