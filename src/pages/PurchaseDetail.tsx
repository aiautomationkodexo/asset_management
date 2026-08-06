import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Purchase, PurchaseAsset } from '@/types/finance'
import { Card } from '@/components/ui/Card'

export function PurchaseDetail() {
  const { id } = useParams()
  const [purchase, setPurchase] = useState<Purchase | null>(null)
  const [assets, setAssets] = useState<PurchaseAsset[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([
      supabase.from('purchases').select('*').eq('id', id).single(),
      supabase.from('purchase_assets').select('*').eq('purchase_id', id),
    ]).then(([purchaseRes, assetsRes]) => {
      setPurchase(purchaseRes.data as Purchase)
      setAssets((assetsRes.data ?? []) as PurchaseAsset[])
      setIsLoading(false)
    })
  }, [id])

  if (isLoading || !purchase) return <div className="p-8 text-text-secondary">Loading...</div>

  const total = assets.reduce((sum, a) => sum + (a.unit_cost ?? 0), 0)

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
      <Card className="max-w-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-bg-alt text-left text-text-secondary">
            <tr>
              <th className="px-4 py-3 font-medium">Asset</th>
              <th className="px-4 py-3 font-medium">Unit cost</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => (
              <tr key={a.id} className="border-b border-divider last:border-0">
                <td className="px-4 py-3">
                  <Link to={`/assets/${a.asset_id}`} className="text-brand-red hover:underline">
                    <code>{a.asset_tag}</code>
                  </Link>
                </td>
                <td className="px-4 py-3 text-text-primary">{a.unit_cost.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="px-4 py-3 font-medium text-text-secondary">Total</td>
              <td className="px-4 py-3 font-medium text-text-primary">{total.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </Card>
    </div>
  )
}
