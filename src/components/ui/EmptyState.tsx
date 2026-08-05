import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-radius-md bg-bg-alt text-text-tertiary">
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <p className="text-body-sm font-medium text-text-primary">{title}</p>
      {description && <p className="text-body-xs text-text-secondary">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
