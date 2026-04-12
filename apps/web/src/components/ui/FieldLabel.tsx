import React from 'react'
import * as Tooltip from '@radix-ui/react-tooltip'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface FieldLabelProps {
  label: string
  htmlFor?: string
  description?: string
  example?: string
  required?: boolean
  className?: string
  children?: React.ReactNode
}

export function FieldLabel({ label, htmlFor, description, example, required, className, children }: FieldLabelProps) {
  const hasTooltip = description || example

  return (
    <Tooltip.Provider delayDuration={200}>
      <div className={cn('flex flex-col gap-1', className)}>
        <div className="flex items-center gap-1.5">
          <label htmlFor={htmlFor} className="text-sm font-medium text-text-primary cursor-pointer">
            {label}
            {required && <span className="ml-0.5 text-danger">*</span>}
          </label>
          {hasTooltip && (
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button
                  type="button"
                  className="text-text-secondary hover:text-primary transition-colors focus:outline-none"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  side="top"
                  align="start"
                  sideOffset={4}
                  className="z-50 max-w-xs rounded-md border border-border bg-white px-3 py-2 shadow-md"
                >
                  {description && (
                    <p className="text-xs text-text-primary">{description}</p>
                  )}
                  {example && (
                    <p className="mt-1 text-xs text-text-secondary">
                      <span className="font-medium">Ex:</span> {example}
                    </p>
                  )}
                  <Tooltip.Arrow className="fill-border" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          )}
        </div>
        {children}
      </div>
    </Tooltip.Provider>
  )
}
