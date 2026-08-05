import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Purchase } from '@/types/finance'

interface LinkedAsset {
  id: string
  asset_tag: string
  purchase_cost_base: number | null
}

export function PurchaseDetail() {
  const { id } = useParams()
  const [purchase, setPurchase] = useState<Purchase | null>(null)
  const [assets, setAssets] = useState<LinkedAsset[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([
      supabase.from('purchases').select('*').eq('id', id).single(),
      supabase.from('assets').select('id, asset_tag, purchase_cost_base').eq('purchase_id', id),
    ]).then(([purchaseRes, assetsRes]) => {
      setPurchase(purchaseRes.data as Purchase)
      setAssets((assetsRes.data ?? []) as LinkedAsset[])
      setIsLoading(false)
    })
  }, [id])

  if (isLoading || !purchase) return <div className="p-8 text-text-secondary">Loading...</div>

  const total = assets.reduce((sum, a) => sum + (a.purchase_cost_base ?? 0), 0)

  return (
    <div className="p-8">
      <h1 className="mb-2 text-3xl">{purchase.vendor}</h1>
      <p className="mb-6 text-sm text-text-secondary">
        Invoice {purchase.invoice_number ?? '—'} · {purchase.purchase_date} · {purchase.currency}{' '}
        {purchase.amount.toFixed(2)} (fx {purchase.fx_rate})
        {purchase.warranty_until && ` · Warranty until ${purchase.warranty_until}`}
      </p>

      {purchase.invoice_file_data_url && (
        <a
          href={purchase.invoice_file_data_url}
          download={`${purchase.vendor}-invoice`}
          className="mb-6 inline-block text-sm text-brand-red hover:underline"
        >
          Download invoice file
        </a>
      )}

      <h2 className="mb-3 text-xl">Linked assets ({assets.length})</h2>
      <div className="max-w-lg overflow-hidden rounded-radius-lg border border-border bg-bg-elevated shadow-sm">
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
                  <Link to={`/assets/${a.id}`} className="text-brand-red hover:underline">
                    <code>{a.asset_tag}</code>
                  </Link>
                </td>
                <td className="px-4 py-3 text-text-primary">{(a.purchase_cost_base ?? 0).toFixed(2)}</td>
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
      </div>
    </div>
  )
}
