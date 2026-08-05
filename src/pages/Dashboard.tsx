import { useEffect, useState } from 'react'
import { Boxes, Package, CheckCircle2, Wrench, AlertTriangle, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { AssetStatus } from '@/types/asset'
import { ASSET_STATUSES } from '@/types/asset'
import { ASSET_STATUS_LABELS, ASSET_STATUS_TONE } from '@/lib/assetStatusStyle'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { TONE_CLASS } from '@/components/ui/Badge'

interface CategoryCount {
  name: string
  count: number
}

const STATUS_ICON: Record<AssetStatus, typeof Package> = {
  in_stock: Package,
  assigned: CheckCircle2,
  in_repair: Wrench,
  lost: AlertTriangle,
  disposed: XCircle,
}

export function Dashboard() {
  const [total, setTotal] = useState<number | null>(null)
  const [byStatus, setByStatus] = useState<Record<AssetStatus, number>>(
    Object.fromEntries(ASSET_STATUSES.map((s) => [s, 0])) as Record<AssetStatus, number>
  )
  const [byCategory, setByCategory] = useState<CategoryCount[]>([])

  const load = async () => {
    const { count } = await supabase
      .from('assets')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
    setTotal(count ?? 0)

    const { data: statusRows } = await supabase
      .from('assets')
      .select('status')
      .is('deleted_at', null)
    if (statusRows) {
      const counts = Object.fromEntries(ASSET_STATUSES.map((s) => [s, 0])) as Record<AssetStatus, number>
      for (const row of statusRows) {
        counts[row.status as AssetStatus] += 1
      }
      setByStatus(counts)
    }

    const { data: categoryRows } = await supabase
      .from('assets')
      .select('asset_categories(name)')
      .is('deleted_at', null)
    if (categoryRows) {
      const counts = new Map<string, number>()
      for (const row of categoryRows as unknown as Array<{ asset_categories: { name: string } | null }>) {
        const name = row.asset_categories?.name ?? 'Uncategorized'
        counts.set(name, (counts.get(name) ?? 0) + 1)
      }
      setByCategory(
        Array.from(counts, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
      )
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [])

  const maxCategoryCount = Math.max(1, ...byCategory.map((c) => c.count))

  return (
    <div className="p-8">
      <PageHeader kicker="Overview" title="Dashboard" />

      {/* Hero figure — the one number this view leads with. Sans, not the
          display face, per the stat-tile contract. */}
      <div className="card-in mb-6 max-w-md overflow-hidden rounded-radius-xl border border-border shadow-md">
        <div className="flex items-center gap-4 bg-gradient-a p-6 text-text-on-brand">
          <Boxes className="h-10 w-10 shrink-0" strokeWidth={1.75} />
          <div>
            <p className="text-sm opacity-90">Total assets</p>
            <p className="font-body text-5xl font-semibold leading-none">{total ?? '—'}</p>
          </div>
        </div>
      </div>

      <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {ASSET_STATUSES.map((status, i) => {
          const Icon = STATUS_ICON[status]
          return (
            <div
              key={status}
              className={`card-in rounded-radius-lg border p-4 shadow-sm ${TONE_CLASS[ASSET_STATUS_TONE[status]]}`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <Icon className="mb-2 h-5 w-5" strokeWidth={1.75} />
              <p className="text-xs opacity-90">{ASSET_STATUS_LABELS[status]}</p>
              {total === null ? (
                <Skeleton className="mt-1 h-7 w-10" />
              ) : (
                <p className="font-body text-2xl font-semibold leading-tight">{byStatus[status]}</p>
              )}
            </div>
          )
        })}
      </div>

      <p className="mono-kicker mb-1">Distribution</p>
      <h2 className="text-h6 mb-3">By category</h2>
      <Card className="max-w-2xl p-5">
        {total === null ? (
          <div className="space-y-3">
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-2 w-full" />
          </div>
        ) : byCategory.length === 0 ? (
          <p className="text-sm text-text-secondary">No assets yet.</p>
        ) : (
          <div className="space-y-3">
            {byCategory.map((row) => (
              <div key={row.name} className="flex items-center gap-3">
                <span className="w-36 shrink-0 truncate text-sm text-text-primary">{row.name}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-radius-pill bg-bg-alt">
                  <div
                    className="h-full rounded-r-radius-sm bg-soft-blue"
                    style={{ width: `${(row.count / maxCategoryCount) * 100}%` }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-sm font-medium tabular-nums text-text-strong">
                  {row.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
