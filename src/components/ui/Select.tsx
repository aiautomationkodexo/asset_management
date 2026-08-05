import type { SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'w-full rounded-radius-sm border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20',
        className
      )}
      {...props}
    />
  )
}
