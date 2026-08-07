import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Plus, Upload, Printer, Boxes } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { AssetCategory, AssetWithRelations } from '@/types/asset'
import { ASSET_STATUSES } from '@/types/asset'
import { ASSET_STATUS_LABELS, ASSET_STATUS_TONE } from '@/lib/assetStatusStyle'
import { generateLabelsPdf } from '@/lib/labelPdf'
import { useSimpleAuth } from '@/contexts/SimpleAuthContext'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { buttonClass } from '@/components/ui/buttonStyles'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

export function AssetList() {
  const { isAdmin } = useSimpleAuth()
  const [assets, setAssets] = useState<AssetWithRelations[]>([])
  const [categories, setCategories] = useState<AssetCategory[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isPrinting, setIsPrinting] = useState(false)

  useEffect(() => {
    supabase
      .from('asset_categories')
      .select('id, name, tag_prefix, is_depreciable, is_physical, default_useful_life_months, default_tax_depr_rate')
      .order('name')
      .then(({ data }) => setCategories(data ?? []))
  }, [])

  const loadAssets = async () => {
    setIsLoading(true)
    setError(null)

    let query = supabase
      .from('assets')
      .select('*, asset_categories(name), locations(name)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (search.trim()) {
      const term = search.trim()
      query = query.or(
        `asset_tag.ilike.%${term}%,make.ilike.%${term}%,model.ilike.%${term}%,serial_no.ilike.%${term}%`
      )
    }
    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }
    if (categoryFilter) {
      query = query.eq('category_id', categoryFilter)
    }

    const { data, error } = await query
    if (error) {
      setError(error.message)
    } else {
      setAssets((data ?? []) as unknown as AssetWithRelations[])
    }
    setIsLoading(false)
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadAssets()
    }, 250)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, categoryFilter])

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => (prev.size === assets.length ? new Set() : new Set(assets.map((a) => a.id))))
  }

  async function handlePrintLabels() {
    setIsPrinting(true)
    try {
      const selected = assets
        .filter((a) => selectedIds.has(a.id))
        .map((a) => ({ asset_tag: a.asset_tag, public_slug: a.public_slug }))
      const doc = await generateLabelsPdf(selected, window.location.origin)
      doc.save(`asset-labels-${new Date().toISOString().slice(0, 10)}.pdf`)
    } finally {
      setIsPrinting(false)
    }
  }

  return (
    <div className="p-4 sm:p-8">
      <PageHeader
        kicker="Inventory"
        title="Assets"
        actions={
          <>
            {selectedIds.size > 0 && (
              <button onClick={handlePrintLabels} disabled={isPrinting} className={buttonClass('tertiary')}>
                <Printer className="h-4 w-4" strokeWidth={1.75} />
                {isPrinting ? 'Generating...' : `Print labels (${selectedIds.size})`}
              </button>
            )}
            {isAdmin && (
              <>
                <Link to="/assets/import" className={buttonClass('tertiary')}>
                  <Upload className="h-4 w-4" strokeWidth={1.75} />
                  Bulk import
                </Link>
                <Link to="/assets/new" className={buttonClass('primary')}>
                  <Plus className="h-4 w-4" strokeWidth={1.75} />
                  Add asset
                </Link>
              </>
            )}
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tag, make, model, serial..."
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto">
          <option value="">All statuses</option>
          {ASSET_STATUSES.map((status) => (
            <option key={status} value={status}>
              {ASSET_STATUS_LABELS[status]}
            </option>
          ))}
        </Select>
        <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-auto">
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
      </div>

      {error && <p className="mb-4 text-sm text-error-text">{error}</p>}

      <Card className="overflow-hidden">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="sticky top-0 z-10 border-b border-border bg-bg-alt text-left text-text-secondary">
              <tr>
                <th className="px-4 py-3 font-medium">
                  <input
                    type="checkbox"
                    checked={assets.length > 0 && selectedIds.size === assets.length}
                    onChange={toggleSelectAll}
                    aria-label="Select all assets"
                  />
                </th>
                <th className="px-4 py-3 font-medium">Tag</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Make / Model</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Location</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-divider last:border-0">
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-4" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-5 w-16 rounded-radius-pill" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-24" />
                    </td>
                  </tr>
                ))
              ) : assets.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={Boxes}
                      title="No assets found"
                      description={search || statusFilter || categoryFilter ? 'Try clearing a filter.' : 'Add the first asset to the register.'}
                      action={
                        isAdmin && (
                          <Link to="/assets/new" className={buttonClass('primary')}>
                            <Plus className="h-4 w-4" strokeWidth={1.75} />
                            Add asset
                          </Link>
                        )
                      }
                    />
                  </td>
                </tr>
              ) : (
                assets.map((asset) => (
                  <tr key={asset.id} className="border-b border-divider last:border-0 hover:bg-bg-alt">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(asset.id)}
                        onChange={() => toggleSelected(asset.id)}
                        aria-label={`Select ${asset.asset_tag}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/assets/${asset.id}`} className="font-medium text-brand-red hover:underline">
                        <code>{asset.asset_tag}</code>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-text-primary">{asset.asset_categories?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-text-primary">
                      {[asset.make, asset.model].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={ASSET_STATUS_TONE[asset.status]}>{ASSET_STATUS_LABELS[asset.status]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-text-primary">{asset.locations?.name ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
