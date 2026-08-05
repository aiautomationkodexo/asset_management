import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { AssetCategory, AssetWithRelations } from '@/types/asset'
import { ASSET_STATUSES } from '@/types/asset'
import { ASSET_STATUS_LABELS, ASSET_STATUS_STYLE } from '@/lib/assetStatusStyle'
import { generateLabelsPdf } from '@/lib/labelPdf'
import { useSimpleAuth } from '@/contexts/SimpleAuthContext'

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
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl">Assets</h1>
        <div className="flex items-center gap-3">
          {selectedIds.size > 0 && (
            <button
              onClick={handlePrintLabels}
              disabled={isPrinting}
              className="rounded-radius-md border border-border bg-bg-alt px-4 py-2 text-sm font-medium text-text-primary hover:bg-border disabled:opacity-50"
            >
              {isPrinting ? 'Generating...' : `Print labels (${selectedIds.size})`}
            </button>
          )}
          {isAdmin && (
            <>
              <Link
                to="/assets/import"
                className="rounded-radius-md border border-border bg-bg-alt px-4 py-2 text-sm font-medium text-text-primary hover:bg-border"
              >
                Bulk import
              </Link>
              <Link
                to="/assets/new"
                className="rounded-radius-md bg-brand-red px-4 py-2 text-sm font-medium text-text-on-brand hover:bg-brand-red-deep"
              >
                Add asset
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tag, make, model, serial..."
          className="w-64 rounded-radius-md border border-border bg-bg px-3 py-2 text-sm text-text-primary"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-radius-md border border-border bg-bg px-3 py-2 text-sm text-text-primary"
        >
          <option value="">All statuses</option>
          {ASSET_STATUSES.map((status) => (
            <option key={status} value={status}>
              {ASSET_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-radius-md border border-border bg-bg px-3 py-2 text-sm text-text-primary"
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="mb-4 text-sm text-error-text">{error}</p>}

      <div className="overflow-hidden rounded-radius-lg border border-border bg-bg-elevated shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-bg-alt text-left text-text-secondary">
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
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-text-secondary">
                  Loading...
                </td>
              </tr>
            ) : assets.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-text-secondary">
                  No assets found.
                </td>
              </tr>
            ) : (
              assets.map((asset) => (
                <tr
                  key={asset.id}
                  className="card-in border-b border-divider last:border-0 hover:bg-bg-alt"
                >
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
                    <span
                      className={`rounded-radius-pill border px-2 py-0.5 text-xs font-medium ${ASSET_STATUS_STYLE[asset.status]}`}
                    >
                      {ASSET_STATUS_LABELS[asset.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-primary">{asset.locations?.name ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
