import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calculator, TrendingDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { bookValueAtMonths, reducingBalanceSchedule } from '@/lib/depreciation'
import type { AssetCategory } from '@/types/asset'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Label } from '@/components/ui/Label'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { EmptyState } from '@/components/ui/EmptyState'
import { buttonClass } from '@/components/ui/buttonStyles'

interface MilestoneValue {
  month: number
  value: number | null
}

interface Row {
  asset_id: string
  asset_tag: string
  category_name: string
  cost: number
  milestones: MilestoneValue[]
}

const BOOK_VALUE_MILESTONES = [6, 12, 24, 36]

function DepreciationCalculator({ categories }: { categories: AssetCategory[] }) {
  const [categoryId, setCategoryId] = useState('')
  const [cost, setCost] = useState('')
  const [salvage, setSalvage] = useState('0')
  const [usefulLifeMonths, setUsefulLifeMonths] = useState('')
  const [taxRatePercent, setTaxRatePercent] = useState('')

  function handleCategoryChange(id: string) {
    setCategoryId(id)
    const category = categories.find((c) => c.id === id)
    if (category) {
      setUsefulLifeMonths(category.default_useful_life_months != null ? String(category.default_useful_life_months) : '')
      // default_tax_depr_rate is stored as a fraction (0.15 = 15%), matching
      // the FSD §7.2 formula (opening_wdv × category_tax_rate) — this field
      // is a whole-percent input, so convert on the way in.
      setTaxRatePercent(category.default_tax_depr_rate != null ? String(category.default_tax_depr_rate * 100) : '')
    }
  }

  const costNum = Number(cost) || 0
  const salvageNum = Number(salvage) || 0
  const usefulLifeNum = Number(usefulLifeMonths) || 0
  const taxRateNum = Number(taxRatePercent) || 0
  const hasCost = costNum > 0

  const monthlyCharge = usefulLifeNum > 0 ? (costNum - salvageNum) / usefulLifeNum : 0
  const milestones = BOOK_VALUE_MILESTONES.filter((m) => !usefulLifeNum || m <= usefulLifeNum)
  const bookRows = (milestones.length > 0 ? milestones : usefulLifeNum ? [usefulLifeNum] : []).map((m) => ({
    month: m,
    value: bookValueAtMonths(costNum, salvageNum, usefulLifeNum, m),
  }))

  const taxYears = usefulLifeNum > 0 ? Math.min(10, Math.max(1, Math.ceil(usefulLifeNum / 12))) : 5
  const taxRows = reducingBalanceSchedule(costNum, taxRateNum, taxYears)

  return (
    <Card className="card-in mb-8 p-6">
      <div className="mb-1 flex items-center gap-2">
        <Calculator className="h-5 w-5 text-brand-red" strokeWidth={1.75} />
        <h2 className="text-h6">Estimate a new purchase</h2>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <Label>Category (optional)</Label>
          <Select value={categoryId} onChange={(e) => handleCategoryChange(e.target.value)}>
            <option value="">None</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Purchase cost</Label>
          <Input type="number" step="0.01" placeholder="0.00" value={cost} onChange={(e) => setCost(e.target.value)} />
        </div>
        <div>
          <Label>Salvage value</Label>
          <Input type="number" step="0.01" value={salvage} onChange={(e) => setSalvage(e.target.value)} />
        </div>
        <div>
          <Label>Useful life (months)</Label>
          <Input
            type="number"
            step="1"
            placeholder="e.g. 36"
            value={usefulLifeMonths}
            onChange={(e) => setUsefulLifeMonths(e.target.value)}
          />
        </div>
        <div>
          <Label>Tax depreciation rate %</Label>
          <Input
            type="number"
            step="0.1"
            placeholder="e.g. 15"
            value={taxRatePercent}
            onChange={(e) => setTaxRatePercent(e.target.value)}
          />
        </div>
      </div>

      {hasCost && (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-1 text-body-xs font-medium uppercase tracking-wide text-text-tertiary">
              Book value — straight-line
            </h3>
            <p className="mb-2 text-sm text-text-secondary">
              Monthly charge: <span className="font-medium text-text-primary">{monthlyCharge.toFixed(2)}</span>
            </p>
            <div className="overflow-x-auto rounded-radius-md border border-border">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-bg-alt text-left text-text-secondary">
                  <tr>
                    <th className="px-3 py-2 font-medium">Month</th>
                    <th className="px-3 py-2 font-medium">Book value</th>
                  </tr>
                </thead>
                <tbody>
                  {bookRows.map((r) => (
                    <tr key={r.month} className="border-b border-divider last:border-0">
                      <td className="px-3 py-2 text-text-primary">{r.month}</td>
                      <td className="px-3 py-2 text-text-primary">{r.value.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="mb-1 text-body-xs font-medium uppercase tracking-wide text-text-tertiary">
              Tax value — reducing balance
            </h3>
            <p className="mb-2 text-sm text-text-secondary">
              {taxRateNum > 0 ? `${taxRateNum}% per year on the opening written-down value` : 'Enter a tax rate to see a schedule.'}
            </p>
            <div className="overflow-x-auto rounded-radius-md border border-border">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-bg-alt text-left text-text-secondary">
                  <tr>
                    <th className="px-3 py-2 font-medium">Year</th>
                    <th className="px-3 py-2 font-medium">Opening</th>
                    <th className="px-3 py-2 font-medium">Charge</th>
                    <th className="px-3 py-2 font-medium">Closing</th>
                  </tr>
                </thead>
                <tbody>
                  {taxRows.map((r) => (
                    <tr key={r.year} className="border-b border-divider last:border-0">
                      <td className="px-3 py-2 text-text-primary">{r.year}</td>
                      <td className="px-3 py-2 text-text-primary">{r.opening.toFixed(2)}</td>
                      <td className="px-3 py-2 text-text-primary">{r.charge.toFixed(2)}</td>
                      <td className="px-3 py-2 text-text-primary">{r.closing.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

export function Depreciation() {
  const [rows, setRows] = useState<Row[]>([])
  const [categories, setCategories] = useState<AssetCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('asset_categories')
      .select('id, name, tag_prefix, is_depreciable, is_physical, default_useful_life_months, default_tax_depr_rate')
      .order('name')
      .then(({ data }) => setCategories((data ?? []) as AssetCategory[]))

    supabase
      .from('assets')
      .select(
        'id, asset_tag, purchase_cost_base, salvage_value, useful_life_months, in_service_date, asset_categories(name, is_depreciable)'
      )
      .is('deleted_at', null)
      .not('purchase_cost_base', 'is', null)
      .then(({ data }) => {
        const built: Row[] = []
        for (const a of (data ?? []) as any[]) {
          const category = a.asset_categories
          if (category?.is_depreciable === false) continue
          if (!a.in_service_date) continue
          const cost = a.purchase_cost_base
          const salvage = a.salvage_value ?? 0
          const usefulLife = a.useful_life_months
          const milestones = BOOK_VALUE_MILESTONES.map((month) => ({
            month,
            // A milestone past the asset's own useful life doesn't apply — leave it blank
            // rather than showing the fully-depreciated (salvage) value as if it were real.
            value: usefulLife && month > usefulLife ? null : bookValueAtMonths(cost, salvage, usefulLife ?? 0, month),
          }))
          built.push({
            asset_id: a.id,
            asset_tag: a.asset_tag,
            category_name: category?.name ?? 'Uncategorized',
            cost,
            milestones,
          })
        }
        setRows(built)
        setIsLoading(false)
      })
  }, [])

  if (isLoading) return <div className="p-4 sm:p-8 text-text-secondary">Loading...</div>

  const totalCost = rows.reduce((sum, r) => sum + r.cost, 0)

  return (
    <div className="p-4 sm:p-8">
      <PageHeader
        kicker="Finance"
        title="Depreciation register"
        subtitle="Book value per asset, straight-line, calculated on demand — no month-end close, no snapshots."
      />

      <DepreciationCalculator categories={categories} />

      <h2 className="mb-3 text-h6">Current register</h2>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-border bg-bg-alt text-left text-text-secondary">
            <tr>
              <th className="px-4 py-3 font-medium">Asset</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Cost</th>
              {BOOK_VALUE_MILESTONES.map((m) => (
                <th key={m} className="px-4 py-3 font-medium">
                  Book value @ {m}mo
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3 + BOOK_VALUE_MILESTONES.length}>
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
                  {r.milestones.map((m) => (
                    <td key={m.month} className="px-4 py-3 text-text-primary">
                      {m.value === null ? <span className="text-text-tertiary">—</span> : m.value.toFixed(2)}
                    </td>
                  ))}
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
                {BOOK_VALUE_MILESTONES.map((m) => (
                  <td key={m} className="px-4 py-3" />
                ))}
              </tr>
            </tfoot>
          )}
        </table>
        </div>
      </Card>
    </div>
  )
}
