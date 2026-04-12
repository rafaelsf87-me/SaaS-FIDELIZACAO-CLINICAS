import { Construction } from 'lucide-react'

interface PlaceholderPageProps {
  title: string
  description?: string
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-lighter mb-4">
        <Construction className="h-7 w-7 text-primary" />
      </div>
      <h2 className="text-lg font-semibold text-text-primary mb-1">{title}</h2>
      <p className="text-sm text-text-secondary max-w-xs">
        {description ?? 'Esta página está em construção e será implementada em breve.'}
      </p>
    </div>
  )
}
