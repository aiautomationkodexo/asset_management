import type { ReactNode } from 'react'

export function PageHeader({
  kicker,
  title,
  subtitle,
  actions,
}: {
  kicker?: string
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        {kicker && <p className="mono-kicker mb-1">{kicker}</p>}
        <h1 className="text-h3">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  )
}
