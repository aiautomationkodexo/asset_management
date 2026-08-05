import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { bookValue, taxValue, periodStart } from '@/lib/depreciation'
import { useSimpleAuth } from '@/contexts/SimpleAuthContext'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { buttonClass } from '@/components/ui/buttonStyles'

interface RegisterRow {
  asset_id: string
  asset_tag: string
  category_id: string
  category_name: string
  cost: number
  salvage: number
  usefulLifeMonths: number | null
  inServiceDate: string | null
  taxRate: number | null
  book: number
  tax: number
}

interface CategoryOption {
  id: string
  name: string
  default_tax_depr_rate: number | null
}

export function DepreciationRegister() {
  const { isAdmin } = useSimpleAuth()
  const [rows, setRows] = useState<RegisterRow[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRunning, setIsRunning] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  function load() {
    Promise.all([
      supabase
        .from('assets')
        .select(
          'id, asset_tag, category_id, purchase_cost_base, salvage_value, useful_life_months, in_service_date, asset_categories(id, name, is_depreciable, default_useful_life_months, default_tax_depr_rate)'
        )
        .is('deleted_at', null)
        .not('purchase_cost_base', 'is', null),
      supabase.from('asset_categories').select('id, name, default_tax_depr_rate'),
    ]).then(([assetsRes, categoriesRes]) => {
      setCategories((categoriesRes.data ?? []) as CategoryOption[])
      const now = new Date()
      const built: RegisterRow[] = []
      for (const a of (assetsRes.data ?? []) as any[]) {
        const category = a.asset_categories
        if (!category || category.is_depreciable === false) continue
        if (!a.in_service_date) continue
        const cost = a.purchase_cost_base
        const salvage = a.salvage_value ?? 0
        const usefulLifeMonths = a.useful_life_months ?? category.default_useful_life_months
        const taxRate = category.default_tax_depr_rate
        built.push({
          asset_id: a.id,
          asset_tag: a.asset_tag,
          category_id: category.id,
          category_name: category.name,
          cost,
          salvage,
          usefulLifeMonths,
          inServiceDate: a.in_service_date,
          taxRate,
          book: usefulLifeMonths ? bookValue(cost, salvage, usefulLifeMonths, a.in_service_date, now) : cost,
          tax: taxValue(cost, taxRate ?? 0, a.in_service_date, now),
        })
      }
      setRows(built)
      setIsLoading(false)
    })
  }

  useEffect(load, [])

  async function saveTaxRate(categoryId: string, ratePercent: string) {
    const rate = Number(ratePercent) / 100
    await supabase.from('asset_categories').update({ default_tax_depr_rate: rate }).eq('id', categoryId)
    load()
  }

  async function runMonthEndClose() {
    setIsRunning(true)
    setMessage(null)
    const now = new Date()
    const period = periodStart(now)
    const nextPeriod = periodStart(new Date(now.getFullYear(), now.getMonth() + 1, 1))
    const periodDate = new Date(period)
    const nextPeriodDate = new Date(nextPeriod)

    const snapshots = rows.flatMap((r) => {
      if (!r.usefulLifeMonths || !r.inServiceDate) return []
      const openingBook = bookValue(r.cost, r.salvage, r.usefulLifeMonths, r.inServiceDate, periodDate)
      const closingBook = bookValue(r.cost, r.salvage, r.usefulLifeMonths, r.inServiceDate, nextPeriodDate)
      const openingTax = taxValue(r.cost, r.taxRate ?? 0, r.inServiceDate, periodDate)
      const closingTax = taxValue(r.cost, r.taxRate ?? 0, r.inServiceDate, nextPeriodDate)
      return [
        {
          asset_id: r.asset_id,
          period,
          method: 'book',
          opening_value: openingBook,
          charge: openingBook - closingBook,
          closing_value: closingBook,
        },
        {
          asset_id: r.asset_id,
          period,
          method: 'tax',
          opening_value: openingTax,
          charge: openingTax - closingTax,
          closing_value: closingTax,
        },
      ]
    })

    if (snapshots.length > 0) {
      await supabase.from('depreciation_snapshots').upsert(snapshots, {
        onConflict: 'asset_id,period,method',
        ignoreDuplicates: true,
      })
    }
    setIsRunning(false)
    setMessage(`Month-end close run for ${period}. ${snapshots.length} snapshot rows (existing periods skipped).`)
  }

  function exportCsv() {
    const header = 'asset_tag,category,cost,book_value,tax_value\n'
    const body = rows
      .map((r) => [r.asset_tag, r.category_name, r.cost, r.book.toFixed(2), r.tax.toFixed(2)].join(','))
      .join('\n')
    const blob = new Blob([header + body], { type: 'text/csv' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `depreciation-register-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
  }

  if (isLoading) return <div className="p-8 text-text-secondary">Loading...</div>

  return (
    <div className="p-8">
      <PageHeader kicker="Finance" title="Depreciation register" />

      {isAdmin && (
        <Card className="mb-6 max-w-2xl p-4">
          <h2 className="text-body-sm mb-2 font-medium text-text-secondary">Per-category tax depreciation rate (annual %)</h2>
          <div className="flex flex-wrap gap-3">
            {categories.map((c) => (
              <CategoryRateInput key={c.id} category={c} onSave={saveTaxRate} />
            ))}
          </div>
        </Card>
      )}

      <div className="mb-4 flex gap-3">
        {isAdmin && (
          <button onClick={runMonthEndClose} disabled={isRunning} className={buttonClass('primary')}>
            {isRunning ? 'Running...' : 'Run month-end close'}
          </button>
        )}
        <button onClick={exportCsv} className={buttonClass('tertiary')}>
          <Download className="h-4 w-4" strokeWidth={1.75} />
          Export CSV
        </button>
      </div>

      {message && <p className="mb-4 text-sm text-success-text">{message}</p>}

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-bg-alt text-left text-text-secondary">
            <tr>
              <th className="px-4 py-3 font-medium">Asset</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Cost</th>
              <th className="px-4 py-3 font-medium">Book value</th>
              <th className="px-4 py-3 font-medium">Tax value</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-text-secondary">
                  No depreciable assets with a purchase cost yet.
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
                  <td className="px-4 py-3 text-text-primary">{r.tax.toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function CategoryRateInput({
  category,
  onSave,
}: {
  category: CategoryOption
  onSave: (id: string, ratePercent: string) => void
}) {
  const [value, setValue] = useState(
    category.default_tax_depr_rate != null ? String(category.default_tax_depr_rate * 100) : ''
  )
  return (
    <div className="flex items-center gap-1 text-sm">
      <span className="text-text-secondary">{category.name}</span>
      <Input
        type="number"
        step="0.1"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => onSave(category.id, value)}
        className="w-16 py-1"
      />
      <span className="text-text-tertiary">%</span>
    </div>
  )
}
