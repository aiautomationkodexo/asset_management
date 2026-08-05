import type { ElementType, ComponentPropsWithoutRef } from 'react'
import { cn } from '@/lib/utils'

type CardProps<T extends ElementType> = { as?: T } & Omit<ComponentPropsWithoutRef<T>, 'as'>

export function Card<T extends ElementType = 'div'>({ as, className, ...props }: CardProps<T>) {
  const Component = as ?? 'div'
  return (
    <Component
      className={cn('rounded-radius-lg border border-border bg-bg-elevated shadow-sm', className)}
      {...props}
    />
  )
}
