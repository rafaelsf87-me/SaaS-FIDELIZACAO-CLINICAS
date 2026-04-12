'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { BookOpen, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step {
  title: string
  description: string
}

interface FieldGuideProps {
  title: string
  steps: Step[]
  className?: string
}

export function FieldGuide({ title, steps, className }: FieldGuideProps) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className={cn(
            'text-text-secondary hover:text-primary transition-colors focus:outline-none',
            className
          )}
          title="Ver passo a passo"
        >
          <BookOpen className="h-4 w-4" />
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-lg border border-border bg-white p-6 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-base font-semibold text-text-primary">
              {title}
            </Dialog.Title>
            <Dialog.Close className="text-text-secondary hover:text-text-primary transition-colors">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          {steps.length === 0 && (
            <p className="text-sm text-text-secondary">Nenhum passo disponível.</p>
          )}
          <ol className="flex flex-col gap-4">
            {steps.map((step, index) => (
              <li key={index} className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white text-xs font-semibold">
                  {index + 1}
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="text-sm font-medium text-text-primary">{step.title}</p>
                  <p className="mt-0.5 text-xs text-text-secondary">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
