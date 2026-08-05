import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { downloadCsv } from '@/lib/csv'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { buttonClass } from '@/components/ui/buttonStyles'

interface ValueByCategory {
  category: string
  value: number
}
interface ValueByDept {
  department: string
  value: number
}
interface InStockRow {
  asset_tag: string
  category: string
}
interface CustodyRow {
  department: string
  employee: string
  asset_tag: string
}
interface WarrantyRow {
  asset_tag: string
  vendor: string
  warranty_until: string
}
interface RepairRow {
  asset_tag: string
  days_open: number
}
interface UnscannedRow {
  asset_tag: string
  last_scanned: string
}

const NOT_SCANNED_MONTHS = 3
const IN_REPAIR_TOO_LONG_DAYS = 14

export function Reports() {
  const [valueByCategory, setValueByCategory] = useState<ValueByCategory[]>([])
  const [valueByDept, setValueByDept] = useState<ValueByDept[]>([])
  const [inStock, setInStock] = useState<InStockRow[]>([])
  const [custody, setCustody] = useState<CustodyRow[]>([])
  const [warranty, setWarranty] = useState<WarrantyRow[]>([])
  const [repairTooLong, setRepairTooLong] = useState<RepairRow[]>([])
  const [unscanned, setUnscanned] = useState<UnscannedRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: assets } = await supabase
        .from('assets')
        .select('id, asset_tag, status, purchase_cost_base, in_service_date, useful_life_months, asset_categories(name)')
        .is('deleted_at', null)

      const assetRows = (assets ?? []) as any[]

      const byCategory = new Map<string, number>()
      for (const a of assetRows) {
        const name = a.asset_categories?.name ?? 'Uncategorized'
        byCategory.set(name, (byCategory.get(name) ?? 0) + (a.purchase_cost_base ?? 0))
      }
      setValueByCategory(Array.from(byCategory, ([category, value]) => ({ category, value })))

      setInStock(
        assetRows
          .filter((a) => a.status === 'in_stock')
          .map((a) => ({ asset_tag: a.asset_tag, category: a.asset_categories?.name ?? '—' }))
      )

      const { data: openAssignments } = await supabase
        .from('assignments')
        .select('asset_id, employees(name, department), assets(asset_tag, purchase_cost_base)')
        .is('returned_at', null)

      const assignRows = (openAssignments ?? []) as any[]
      const byDept = new Map<string, number>()
      for (const r of assignRows) {
        const dept = r.employees?.department ?? 'Unassigned'
        byDept.set(dept, (byDept.get(dept) ?? 0) + (r.assets?.purchase_cost_base ?? 0))
      }
      setValueByDept(Array.from(byDept, ([department, value]) => ({ department, value })))
      setCustody(
        assignRows.map((r) => ({
          department: r.employees?.department ?? 'Unassigned',
          employee: r.employees?.name ?? '—',
          asset_tag: r.assets?.asset_tag ?? '—',
        }))
      )

      const today = new Date()
      const in60 = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000)
      const { data: purchases } = await supabase
        .from('purchases')
        .select('id, vendor, warranty_until')
        .not('warranty_until', 'is', null)
        .gte('warranty_until', today.toISOString().slice(0, 10))
        .lte('warranty_until', in60.toISOString().slice(0, 10))

      const warrantyRows: WarrantyRow[] = []
      for (const p of purchases ?? []) {
        const { data: linkedAssets } = await supabase.from('assets').select('asset_tag').eq('purchase_id', p.id)
        for (const a of linkedAssets ?? []) {
          warrantyRows.push({ asset_tag: a.asset_tag, vendor: p.vendor, warranty_until: p.warranty_until as string })
        }
      }
      setWarranty(warrantyRows)

      const { data: openLogs } = await supabase
        .from('maintenance_logs')
        .select('asset_id, log_date, assets(asset_tag)')
        .is('resolved_at', null)

      const repairRows: RepairRow[] = []
      for (const log of (openLogs ?? []) as any[]) {
        const daysOpen = Math.floor((today.getTime() - new Date(log.log_date).getTime()) / (24 * 60 * 60 * 1000))
        if (daysOpen >= IN_REPAIR_TOO_LONG_DAYS) {
          repairRows.push({ asset_tag: log.assets?.asset_tag ?? '—', days_open: daysOpen })
        }
      }
      setRepairTooLong(repairRows)

      const { data: scans } = await supabase.from('audit_scans').select('asset_id, scanned_at').not('asset_id', 'is', null)
      const lastScanByAsset = new Map<string, string>()
      for (const s of scans ?? []) {
        const existing = lastScanByAsset.get(s.asset_id as string)
        if (!existing || s.scanned_at > existing) lastScanByAsset.set(s.asset_id as string, s.scanned_at)
      }
      const cutoff = new Date(today.getFullYear(), today.getMonth() - NOT_SCANNED_MONTHS, today.getDate())
      setUnscanned(
        assetRows
          .filter((a) => a.status !== 'disposed')
          .filter((a) => {
            const last = lastScanByAsset.get(a.id)
            return !last || new Date(last) < cutoff
          })
          .map((a) => ({ asset_tag: a.asset_tag, last_scanned: lastScanByAsset.get(a.id) ?? 'Never' }))
      )

      setIsLoading(false)
    }
    load()
  }, [])

  if (isLoading) return <div className="p-8 text-text-secondary">Loading...</div>

  return (
    <div className="p-8 space-y-8">
      <PageHeader kicker="Insights" title="Reports" />

      <ReportCard
        title="What we own & its value — by category"
        rows={valueByCategory}
        columns={[
          ['category', 'Category'],
          ['value', 'Value'],
        ]}
        filename="value-by-category.csv"
      />
      <ReportCard
        title="What we own & its value — by department"
        rows={valueByDept}
        columns={[
          ['department', 'Department'],
          ['value', 'Value'],
        ]}
        filename="value-by-department.csv"
      />
      <ReportCard
        title="What's sitting unused (in-stock)"
        rows={inStock}
        columns={[
          ['asset_tag', 'Asset'],
          ['category', 'Category'],
        ]}
        filename="in-stock.csv"
      />
      <ReportCard
        title="Who has what — custody by department"
        rows={custody}
        columns={[
          ['department', 'Department'],
          ['employee', 'Employee'],
          ['asset_tag', 'Asset'],
        ]}
        filename="custody-by-department.csv"
      />
      <ReportCard
        title="Losing warranty soon (60 days)"
        rows={warranty}
        columns={[
          ['asset_tag', 'Asset'],
          ['vendor', 'Vendor'],
          ['warranty_until', 'Warranty until'],
        ]}
        filename="warranty-expiring.csv"
      />
      <ReportCard
        title={`In repair too long (>${IN_REPAIR_TOO_LONG_DAYS} days)`}
        rows={repairTooLong}
        columns={[
          ['asset_tag', 'Asset'],
          ['days_open', 'Days open'],
        ]}
        filename="in-repair-too-long.csv"
      />
      <ReportCard
        title={`Not scanned in ${NOT_SCANNED_MONTHS}+ months`}
        rows={unscanned}
        columns={[
          ['asset_tag', 'Asset'],
          ['last_scanned', 'Last scanned'],
        ]}
        filename="not-scanned-recently.csv"
      />
    </div>
  )
}

function ReportCard<T extends object>({
  title,
  rows,
  columns,
  filename,
}: {
  title: string
  rows: T[]
  columns: Array<[keyof T, string]>
  filename: string
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-h6">{title}</h2>
        <button
          onClick={() => downloadCsv(filename, rows as unknown as Array<Record<string, unknown>>)}
          className={buttonClass('tertiary')}
        >
          <Download className="h-4 w-4" strokeWidth={1.75} />
          Export CSV
        </button>
      </div>
      <Card className="max-w-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-bg-alt text-left text-text-secondary">
            <tr>
              {columns.map(([key, label]) => (
                <th key={String(key)} className="px-4 py-2 font-medium">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-4 text-center text-text-secondary">
                  Nothing to show.
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i} className="border-b border-divider last:border-0 hover:bg-bg-alt">
                  {columns.map(([key]) => (
                    <td key={String(key)} className="px-4 py-2 text-text-primary">
                      {typeof row[key] === 'number' ? (row[key] as number).toFixed(2) : String(row[key])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
