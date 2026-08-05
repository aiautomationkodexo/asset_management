import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { bookValue } from '@/lib/depreciation'
import type { AssetWithRelations } from '@/types/asset'

const FIELD_CLASS = 'w-full rounded-radius-md border border-border bg-bg px-3 py-2 text-sm text-text-primary'
const LABEL_CLASS = 'mb-1 block text-sm font-medium text-text-primary'

export function DisposalPanel({ asset, onChanged }: { asset: AssetWithRelations; onChanged: () => void }) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [method, setMethod] = useState('')
  const [proceeds, setProceeds] = useState('0')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  if (asset.status === 'disposed') {
    return <p className="mb-6 text-sm text-text-secondary">This asset has been disposed.</p>
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-6 rounded-radius-md border border-border bg-bg-alt px-4 py-2 text-sm font-medium text-text-primary hover:bg-border"
      >
        Dispose asset
      </button>
    )
  }

  async function handleSubmit() {
    setIsSaving(true)
    setError(null)

    const cost = asset.purchase_cost_base ?? 0
    const bookValueAtDisposal =
      cost && asset.useful_life_months && asset.in_service_date
        ? bookValue(cost, asset.salvage_value ?? 0, asset.useful_life_months, asset.in_service_date, new Date(date))
        : cost

    const proceedsNum = Number(proceeds)
    const { error: insertError } = await supabase.from('disposals').insert({
      asset_id: asset.id,
      disposal_date: date,
      method,
      proceeds: proceedsNum,
      book_value_at_disposal: bookValueAtDisposal,
      gain_loss: proceedsNum - bookValueAtDisposal,
    })

    if (!insertError) {
      await supabase.from('assets').update({ status: 'disposed' }).eq('id', asset.id)
    }
    setIsSaving(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    onChanged()
  }

  return (
    <div className="card-in mb-6 max-w-lg space-y-3 rounded-radius-lg border border-border bg-bg-elevated p-6 shadow-sm">
      <h2 className="text-xl">Dispose asset</h2>
      <div>
        <label className={LABEL_CLASS}>Disposal date</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={FIELD_CLASS} />
      </div>
      <div>
        <label className={LABEL_CLASS}>Method</label>
        <input value={method} onChange={(e) => setMethod(e.target.value)} placeholder="Sold, scrapped, donated..." className={FIELD_CLASS} />
      </div>
      <div>
        <label className={LABEL_CLASS}>Proceeds</label>
        <input type="number" step="0.01" value={proceeds} onChange={(e) => setProceeds(e.target.value)} className={FIELD_CLASS} />
      </div>
      {error && <p className="text-sm text-error-text">{error}</p>}
      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          disabled={isSaving || !method}
          className="rounded-radius-md bg-brand-red px-4 py-2 text-sm font-medium text-text-on-brand hover:bg-brand-red-deep disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Confirm disposal'}
        </button>
        <button onClick={() => setOpen(false)} className="text-sm text-text-secondary hover:underline">
          Cancel
        </button>
      </div>
    </div>
  )
}
