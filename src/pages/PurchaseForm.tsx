import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
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

interface LinkedAsset {
  asset_id: string
  asset_tag: string
  unit_cost: string
}

export function PurchaseForm() {
  const navigate = useNavigate()
  const [vendor, setVendor] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [amount, setAmount] = useState('')
  const [fxRate, setFxRate] = useState('1')
  const [warrantyUntil, setWarrantyUntil] = useState('')
  const [invoiceFile, setInvoiceFile] = useState<string | null>(null)

  const [assets, setAssets] = useState<AssetOption[]>([])
  const [linked, setLinked] = useState<LinkedAsset[]>([])
  const [pickAssetId, setPickAssetId] = useState('')
  const [pickUnitCost, setPickUnitCost] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    supabase
      .from('assets')
      .select('id, asset_tag, category_id')
      .is('deleted_at', null)
      .order('asset_tag')
      .then(({ data }) => setAssets((data ?? []) as AssetOption[]))
  }, [])

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setInvoiceFile(reader.result as string)
    reader.readAsDataURL(file)
  }

  function addLinkedAsset() {
    const asset = assets.find((a) => a.id === pickAssetId)
    if (!asset || !pickUnitCost) return
    setLinked((prev) => [...prev, { asset_id: asset.id, asset_tag: asset.asset_tag, unit_cost: pickUnitCost }])
    setPickAssetId('')
    setPickUnitCost('')
  }

  function removeLinkedAsset(assetId: string) {
    setLinked((prev) => prev.filter((l) => l.asset_id !== assetId))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSaving(true)

    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .insert({
        vendor,
        invoice_number: invoiceNumber || null,
        purchase_date: purchaseDate,
        currency,
        amount: Number(amount),
        fx_rate: Number(fxRate),
        warranty_until: warrantyUntil || null,
        invoice_file_data_url: invoiceFile,
      })
      .select('id')
      .single()

    if (purchaseError || !purchase) {
      setIsSaving(false)
      setError(purchaseError?.message ?? 'Failed to create purchase.')
      return
    }

    for (const item of linked) {
      const asset = assets.find((a) => a.id === item.asset_id)
      const { data: category } = await supabase
        .from('asset_categories')
        .select('default_useful_life_months')
        .eq('id', asset?.category_id)
        .single()

      await supabase
        .from('assets')
        .update({
          purchase_id: purchase.id,
          purchase_cost_base: Number(item.unit_cost),
          in_service_date: purchaseDate,
          useful_life_months: category?.default_useful_life_months ?? null,
        })
        .eq('id', item.asset_id)
    }

    setIsSaving(false)
    navigate(`/purchases/${purchase.id}`)
  }

  return (
    <div className="p-8">
      <h1 className="text-h3 mb-6">Record purchase</h1>

      <Card as="form" onSubmit={handleSubmit} className="card-in max-w-lg space-y-4 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Vendor *</Label>
            <Input value={vendor} onChange={(e) => setVendor(e.target.value)} required />
          </div>
          <div>
            <Label>Invoice number</Label>
            <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Purchase date *</Label>
            <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} required />
          </div>
          <div>
            <Label>Warranty until</Label>
            <Input type="date" value={warrantyUntil} onChange={(e) => setWarrantyUntil(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>Currency</Label>
            <Input value={currency} onChange={(e) => setCurrency(e.target.value)} />
          </div>
          <div>
            <Label>Amount *</Label>
            <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div>
            <Label>FX rate</Label>
            <Input type="number" step="0.0001" value={fxRate} onChange={(e) => setFxRate(e.target.value)} />
          </div>
        </div>

        <div>
          <Label>Invoice file</Label>
          <input
            type="file"
            onChange={handleFile}
            className="w-full rounded-radius-sm border border-border bg-bg px-3 py-2 text-sm text-text-primary"
          />
        </div>

        <div className="border-t border-divider pt-4">
          <Label>Link assets (each with its own unit cost)</Label>
          <div className="mb-2 flex gap-2">
            <Select value={pickAssetId} onChange={(e) => setPickAssetId(e.target.value)}>
              <option value="">Select asset</option>
              {assets.map((a) => (
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
            <button type="button" onClick={addLinkedAsset} className={buttonClass('tertiary')}>
              Add
            </button>
          </div>
          {linked.length > 0 && (
            <ul className="space-y-1 text-sm">
              {linked.map((l) => (
                <li key={l.asset_id} className="flex items-center justify-between">
                  <span className="text-text-primary">
                    <code>{l.asset_tag}</code> — {l.unit_cost}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeLinkedAsset(l.asset_id)}
                    className="text-text-secondary hover:underline"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && <p className="text-sm text-error-text">{error}</p>}

        <button type="submit" disabled={isSaving} className={buttonClass('primary')}>
          {isSaving ? 'Saving...' : 'Create purchase'}
        </button>
      </Card>
    </div>
  )
}
