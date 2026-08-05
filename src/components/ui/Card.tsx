import type { ElementType, ComponentPropsWithoutRef } from 'react'
import { cn } from '@/lib/utils'

// Depth comes from a 1px border + a faint bg-elevated -> bg-alt gradient,
// never a box-shadow. Exported so motion.div-wrapped tiles (e.g. the
// dashboard bento grid) can reuse the exact same surface styling.
export function cardClass(className?: string) {
  return cn('rounded-radius-lg border border-border bg-card-tint', className)
}

type CardProps<T extends ElementType> = { as?: T } & Omit<ComponentPropsWithoutRef<T>, 'as'>

export function Card<T extends ElementType = 'div'>({ as, className, ...props }: CardProps<T>) {
  const Component = as ?? 'div'
  return <Component className={cardClass(className)} {...props} />
}
