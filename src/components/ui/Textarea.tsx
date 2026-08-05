import type { TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'w-full rounded-radius-sm border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-brand-red focus:ring-2 focus:ring-brand-red/20',
        className
      )}
      {...props}
    />
  )
}
