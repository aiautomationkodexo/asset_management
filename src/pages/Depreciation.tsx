import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { bookValue } from '@/lib/depreciation'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { buttonClass } from '@/components/ui/buttonStyles'
import { TrendingDown } from 'lucide-react'

interface Row {
  asset_id: string
  asset_tag: string
  category_name: string
  cost: number
  book: number
}

export function Depreciation() {
  const [rows, setRows] = useState<Row[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('assets')
      .select(
        'id, asset_tag, purchase_cost_base, salvage_value, useful_life_months, in_service_date, asset_categories(name, is_depreciable)'
      )
      .is('deleted_at', null)
      .not('purchase_cost_base', 'is', null)
      .then(({ data }) => {
        const now = new Date()
        const built: Row[] = []
        for (const a of (data ?? []) as any[]) {
          const category = a.asset_categories
          if (category?.is_depreciable === false) continue
          if (!a.in_service_date) continue
          const cost = a.purchase_cost_base
          const book = a.useful_life_months
            ? bookValue(cost, a.salvage_value ?? 0, a.useful_life_months, a.in_service_date, now)
            : cost
          built.push({
            asset_id: a.id,
            asset_tag: a.asset_tag,
            category_name: category?.name ?? 'Uncategorized',
            cost,
            book,
          })
        }
        setRows(built)
        setIsLoading(false)
      })
  }, [])

  if (isLoading) return <div className="p-4 sm:p-8 text-text-secondary">Loading...</div>

  const totalCost = rows.reduce((sum, r) => sum + r.cost, 0)
  const totalBook = rows.reduce((sum, r) => sum + r.book, 0)

  return (
    <div className="p-4 sm:p-8">
      <PageHeader
        kicker="Finance"
        title="Depreciation register"
        subtitle="Book value per asset, straight-line, calculated on demand — no month-end close, no snapshots."
      />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="border-b border-border bg-bg-alt text-left text-text-secondary">
            <tr>
              <th className="px-4 py-3 font-medium">Asset</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Cost</th>
              <th className="px-4 py-3 font-medium">Book value</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <EmptyState
                    icon={TrendingDown}
                    title="Nothing to depreciate yet"
                    description="An asset only shows up here once a purchase has been recorded and linked to it — that's what sets its cost, in-service date, and useful life."
                    action={
                      <Link to="/purchases/new" className={buttonClass('primary')}>
                        Record a purchase
                      </Link>
                    }
                  />
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.asset_id} className="border-b border-divider last:border-0 hover:bg-bg-alt">
                  <td className="px-4 py-3">
                    <code>{r.asset_tag}</code>
                  </td>
                  <td className="px-4 py-3 text-text-primary">{r.category_name}</td>
                  <td className="px-4 py-3 text-text-primary">{r.cost.toFixed(2)}</td>
                  <td className="px-4 py-3 text-text-primary">{r.book.toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr>
                <td className="px-4 py-3 font-medium text-text-secondary">Total</td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3 font-medium text-text-primary">{totalCost.toFixed(2)}</td>
                <td className="px-4 py-3 font-medium text-text-primary">{totalBook.toFixed(2)}</td>
              </tr>
            </tfoot>
          )}
        </table>
        </div>
      </Card>
    </div>
  )
}
