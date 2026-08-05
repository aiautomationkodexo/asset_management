import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Boxes, Package, CheckCircle2, Wrench, AlertTriangle, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { AssetStatus } from '@/types/asset'
import { ASSET_STATUSES } from '@/types/asset'
import { ASSET_STATUS_LABELS, ASSET_STATUS_TONE } from '@/lib/assetStatusStyle'
import { PageHeader } from '@/components/ui/PageHeader'
import { cardClass } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { TONE_CLASS } from '@/components/ui/Badge'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { AnimatedBar } from '@/components/ui/AnimatedBar'
import { DonutChart } from '@/components/ui/DonutChart'

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

// Fixed hue order for the distribution chart — chart-only colors, never
// reused for UI chrome. A 5th+ category folds into "Other" (neutral).
const CHART_HUES = ['var(--soft-blue)', 'var(--muted-green)', 'var(--soft-amber)', 'var(--soft-purple)']
const CHART_HUE_CLASS = ['bg-soft-blue', 'bg-muted-green', 'bg-soft-amber', 'bg-soft-purple']

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

  const topCategories = byCategory.slice(0, 4)
  const otherCount = byCategory.slice(4).reduce((sum, c) => sum + c.count, 0)
  const chartRows: CategoryCount[] = otherCount > 0 ? [...topCategories, { name: 'Other', count: otherCount }] : topCategories
  const maxCategoryCount = Math.max(1, ...chartRows.map((c) => c.count))

  return (
    <div className="p-8">
      <PageHeader kicker="Overview" title="Dashboard" />

      {/* Bento grid — hero stat spans 2x2, status tiles fill the rest via
          dense auto-flow so the count doesn't need to be exact. */}
      <div className="mb-8 grid grid-cols-2 gap-4 [grid-auto-flow:dense] sm:grid-cols-3 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          whileHover={{ scale: 1.01 }}
          className="relative col-span-2 row-span-2 overflow-hidden rounded-radius-xl border border-border bg-gradient-a"
        >
          <div className="relative z-10 flex h-full flex-col justify-between p-6 text-text-on-brand">
            <div className="flex items-center gap-2">
              <Boxes className="h-6 w-6" strokeWidth={1.75} />
              <span className="text-sm opacity-90">Total assets</span>
            </div>
            <div className="font-body text-6xl font-bold leading-none tracking-tight sm:text-7xl">
              {total === null ? (
                <Skeleton className="h-16 w-32 bg-white/20" />
              ) : (
                <AnimatedCounter value={total} />
              )}
            </div>
          </div>
        </motion.div>

        {ASSET_STATUSES.map((status, i) => {
          const Icon = STATUS_ICON[status]
          return (
            <motion.div
              key={status}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut', delay: 0.2 + i * 0.06 }}
              whileHover={{ scale: 1.02 }}
              className={`rounded-radius-lg border p-4 transition-colors ${TONE_CLASS[ASSET_STATUS_TONE[status]]}`}
            >
              <Icon className="mb-2 h-5 w-5" strokeWidth={1.75} />
              <p className="text-xs opacity-90">{ASSET_STATUS_LABELS[status]}</p>
              {total === null ? (
                <Skeleton className="mt-1 h-7 w-10" />
              ) : (
                <p className="font-body text-2xl font-semibold leading-tight">
                  <AnimatedCounter value={byStatus[status]} />
                </p>
              )}
            </motion.div>
          )
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: 0.5 }}
      >
        <p className="mono-kicker mb-1">Distribution</p>
        <h2 className="text-h6 mb-3">By category</h2>
        <div className={cardClass('glow-surface p-5')}>
          {total === null ? (
            <div className="space-y-3">
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-2 w-full" />
            </div>
          ) : chartRows.length === 0 ? (
            <p className="text-sm text-text-secondary">No assets yet.</p>
          ) : (
            <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-center">
              <DonutChart
                size={168}
                strokeWidth={18}
                centerValue={String(total)}
                centerLabel="assets"
                segments={chartRows.map((row, i) => ({
                  label: row.name,
                  value: row.count,
                  color: i < CHART_HUES.length ? CHART_HUES[i] : 'var(--n-400)',
                }))}
              />
              <div className="flex-1 space-y-3">
                {chartRows.map((row, i) => (
                  <div key={row.name} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 truncate text-sm text-text-primary">{row.name}</span>
                    <AnimatedBar
                      percent={(row.count / maxCategoryCount) * 100}
                      color={i < CHART_HUE_CLASS.length ? CHART_HUE_CLASS[i] : 'bg-n-400'}
                      delay={0.1 * i}
                    />
                    <span className="w-8 shrink-0 text-right text-sm font-medium tabular-nums text-text-strong">
                      {row.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
