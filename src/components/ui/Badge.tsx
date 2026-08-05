import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type BadgeTone = 'success' | 'warning' | 'error' | 'info' | 'neutral'

export const TONE_CLASS: Record<BadgeTone, string> = {
  success: 'border-success-border bg-success-bg text-success-text',
  warning: 'border-warning-border bg-warning-bg text-warning-text',
  error: 'border-error-border bg-error-bg text-error-text',
  info: 'border-info-border bg-info-bg text-info-text',
  neutral: 'border-border bg-n-100 text-text-tertiary',
}

export function Badge({ tone = 'neutral', className, children }: { tone?: BadgeTone; className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-radius-pill border px-2 py-0.5 text-xs font-medium',
        TONE_CLASS[tone],
        className
      )}
    >
      {children}
    </span>
  )
}
