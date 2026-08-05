import { cn } from '@/lib/utils'

// Kodexo button hierarchy: red is reserved for the ONE primary action per
// screen. Everything else — cancel, filter, export, edit — is tertiary so
// red never multiplies across the UI.
export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger'

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'bg-brand-red text-text-on-brand hover:bg-brand-red-deep border border-transparent',
  secondary: 'bg-brand-black text-brand-white hover:bg-n-800 border border-transparent',
  tertiary: 'border border-border bg-bg-elevated text-text-primary hover:border-n-400 hover:bg-bg-alt',
  ghost: 'text-text-secondary hover:bg-bg-alt hover:text-text-primary',
  danger: 'border border-error-border bg-bg-elevated text-error-text hover:bg-error-bg',
}

export function buttonClass(variant: ButtonVariant = 'primary', className?: string) {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-radius-md px-4 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
    VARIANT_CLASS[variant],
    className
  )
}
