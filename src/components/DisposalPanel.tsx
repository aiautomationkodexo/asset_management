import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { bookValue } from '@/lib/depreciation'
import type { AssetWithRelations } from '@/types/asset'
import { Card } from '@/components/ui/Card'
import { Label } from '@/components/ui/Label'
import { Input } from '@/components/ui/Input'
import { buttonClass } from '@/components/ui/buttonStyles'

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
      <button onClick={() => setOpen(true)} className={buttonClass('danger')}>
        <Trash2 className="h-4 w-4" strokeWidth={1.75} />
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
    <Card className="card-in space-y-3 p-6">
      <h2 className="text-h6">Dispose asset</h2>
      <div>
        <Label>Disposal date</Label>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div>
        <Label>Method</Label>
        <Input value={method} onChange={(e) => setMethod(e.target.value)} placeholder="Sold, scrapped, donated..." />
      </div>
      <div>
        <Label>Proceeds</Label>
        <Input type="number" step="0.01" value={proceeds} onChange={(e) => setProceeds(e.target.value)} />
      </div>
      {error && <p className="text-sm text-error-text">{error}</p>}
      <div className="flex gap-3">
        <button onClick={handleSubmit} disabled={isSaving || !method} className={buttonClass('danger')}>
          {isSaving ? 'Saving...' : 'Confirm disposal'}
        </button>
        <button onClick={() => setOpen(false)} className={buttonClass('tertiary')}>
          Cancel
        </button>
      </div>
    </Card>
  )
}
