import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Purchase, PurchaseAsset } from '@/types/finance'
import { useSimpleAuth } from '@/contexts/SimpleAuthContext'
import { Card } from '@/components/ui/Card'
import { Label } from '@/components/ui/Label'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { buttonClass } from '@/components/ui/buttonStyles'

interface AssetOption {
  id: string
  asset_tag: string
  category_id: string
}

export function PurchaseDetail() {
  const { isAdmin } = useSimpleAuth()
  const { id } = useParams()
  const [purchase, setPurchase] = useState<Purchase | null>(null)
  const [assets, setAssets] = useState<PurchaseAsset[]>([])
  const [assetOptions, setAssetOptions] = useState<AssetOption[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [pickAssetId, setPickAssetId] = useState('')
  const [pickUnitCost, setPickUnitCost] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  function load() {
    if (!id) return
    Promise.all([
      supabase.from('purchases').select('*').eq('id', id).single(),
      supabase.from('purchase_assets').select('*').eq('purchase_id', id),
      supabase.from('assets').select('id, asset_tag, category_id').is('deleted_at', null).order('asset_tag'),
    ]).then(([purchaseRes, assetsRes, optionsRes]) => {
      setPurchase(purchaseRes.data as Purchase)
      setAssets((assetsRes.data ?? []) as PurchaseAsset[])
      setAssetOptions((optionsRes.data ?? []) as AssetOption[])
      setIsLoading(false)
    })
  }

  useEffect(load, [id])

  async function handleAddAsset() {
    if (!purchase || !pickAssetId || !pickUnitCost) return
    setIsSaving(true)
    setError(null)

    const asset = assetOptions.find((a) => a.id === pickAssetId)
    const { error: linkError } = await supabase.from('purchase_assets').insert({
      purchase_id: purchase.id,
      asset_id: pickAssetId,
      asset_tag: asset?.asset_tag ?? '',
      unit_cost: Number(pickUnitCost),
    })
    if (linkError) {
      setIsSaving(false)
      setError(linkError.message)
      return
    }

    const { data: category } = await supabase
      .from('asset_categories')
      .select('default_useful_life_months')
      .eq('id', asset?.category_id)
      .single()

    await supabase
      .from('assets')
      .update({
        purchase_id: purchase.id,
        purchase_cost_base: Number(pickUnitCost),
        in_service_date: purchase.invoice_date,
        useful_life_months: category?.default_useful_life_months ?? null,
      })
      .eq('id', pickAssetId)

    setIsSaving(false)
    setPickAssetId('')
    setPickUnitCost('')
    load()
  }

  if (isLoading || !purchase) return <div className="p-8 text-text-secondary">Loading...</div>

  const total = assets.reduce((sum, a) => sum + (a.unit_cost ?? 0), 0)
  const linkedAssetIds = new Set(assets.map((a) => a.asset_id))
  const availableOptions = assetOptions.filter((a) => !linkedAssetIds.has(a.id))

  return (
    <div className="p-8">
      <h1 className="text-h3 mb-2">{purchase.vendor_name}</h1>
      <p className="mb-6 text-sm text-text-secondary">
        Invoice {purchase.invoice_no ?? '—'} · {purchase.invoice_date} · {purchase.currency}{' '}
        {purchase.amount_original.toFixed(2)} (fx {purchase.fx_rate}, base {purchase.amount_base.toFixed(2)})
        {purchase.warranty_until && ` · Warranty until ${purchase.warranty_until}`}
      </p>

      {purchase.attachment_url && (
        <a
          href={purchase.attachment_url}
          download={`${purchase.vendor_name}-invoice`}
          className="mb-6 inline-block text-sm text-brand-red hover:underline"
        >
          Download invoice file
        </a>
      )}

      <h2 className="text-h6 mb-3">Linked assets ({assets.length})</h2>
      <Card className="mb-6 max-w-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-bg-alt text-left text-text-secondary">
            <tr>
              <th className="px-4 py-3 font-medium">Asset</th>
              <th className="px-4 py-3 font-medium">Unit cost</th>
            </tr>
          </thead>
          <tbody>
            {assets.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-4 py-4 text-center text-text-secondary">
                  No assets linked yet — this purchase has no cost basis attached to anything.
                </td>
              </tr>
            ) : (
              assets.map((a) => (
                <tr key={a.id} className="border-b border-divider last:border-0">
                  <td className="px-4 py-3">
                    <Link to={`/assets/${a.asset_id}`} className="text-brand-red hover:underline">
                      <code>{a.asset_tag}</code>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-text-primary">{a.unit_cost.toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
          {assets.length > 0 && (
            <tfoot>
              <tr>
                <td className="px-4 py-3 font-medium text-text-secondary">Total</td>
                <td className="px-4 py-3 font-medium text-text-primary">{total.toFixed(2)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </Card>

      {isAdmin && (
        <Card className="max-w-lg space-y-3 p-6">
          <Label>Link an asset to this purchase</Label>
          <div className="flex flex-wrap gap-2">
            <Select value={pickAssetId} onChange={(e) => setPickAssetId(e.target.value)} className="flex-1">
              <option value="">Select asset</option>
              {availableOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.asset_tag}
                </option>
              ))}
            </Select>
            <Input
              type="number"
              step="0.01"
              placeholder="Unit cost"
              value={pickUnitCost}
              onChange={(e) => setPickUnitCost(e.target.value)}
              className="w-32"
            />
            <button
              onClick={handleAddAsset}
              disabled={isSaving || !pickAssetId || !pickUnitCost}
              className={buttonClass('primary')}
            >
              {isSaving ? 'Adding...' : 'Add'}
            </button>
          </div>
          {error && <p className="text-sm text-error-text">{error}</p>}
        </Card>
      )}
    </div>
  )
}
