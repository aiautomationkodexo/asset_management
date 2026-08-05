import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { AssetStatus } from '@/types/asset'
import { ASSET_STATUSES } from '@/types/asset'
import { ASSET_STATUS_LABELS } from '@/lib/assetStatusStyle'

interface CategoryCount {
  name: string
  count: number
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
      setByCategory(Array.from(counts, ([name, count]) => ({ name, count })))
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [])

  return (
    <div className="p-8">
      <h1 className="mb-6 text-3xl">Dashboard</h1>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {/* Single tertiary accent (soft-blue) for this Dashboard-overview
            context, per the "one accent per context" rule — flagged as an
            open decision on intended scope in the chat summary. */}
        <div className="card-in rounded-radius-lg border border-l-4 border-border border-l-soft-blue bg-bg-elevated p-4 shadow-sm">
          <p className="text-xs text-text-secondary">Total assets</p>
          <p className="text-2xl font-bold text-text-strong">{total ?? '—'}</p>
        </div>
        {ASSET_STATUSES.map((status) => (
          <div key={status} className="card-in rounded-radius-lg border border-border bg-bg-elevated p-4 shadow-sm">
            <p className="text-xs text-text-secondary">{ASSET_STATUS_LABELS[status]}</p>
            <p className="text-2xl font-bold text-text-strong">{byStatus[status]}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-3 text-lg">By category</h2>
      <div className="overflow-hidden rounded-radius-lg border border-border bg-bg-elevated shadow-sm">
        <table className="w-full text-sm">
          <tbody>
            {byCategory.length === 0 ? (
              <tr>
                <td className="px-4 py-3 text-text-secondary">No assets yet.</td>
              </tr>
            ) : (
              byCategory.map((row) => (
                <tr key={row.name} className="border-b border-divider last:border-0">
                  <td className="px-4 py-3 text-text-primary">{row.name}</td>
                  <td className="px-4 py-3 text-right font-medium text-text-strong">{row.count}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
