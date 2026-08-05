import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Purchase } from '@/types/finance'
import { useSimpleAuth } from '@/contexts/SimpleAuthContext'

export function PurchaseList() {
  const { isAdmin } = useSimpleAuth()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('purchases')
      .select('*')
      .order('purchase_date', { ascending: false })
      .then(({ data }) => {
        setPurchases((data ?? []) as Purchase[])
        setIsLoading(false)
      })
  }, [])

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl">Purchases</h1>
        {isAdmin && (
          <Link
            to="/purchases/new"
            className="rounded-radius-md bg-brand-red px-4 py-2 text-sm font-medium text-text-on-brand hover:bg-brand-red-deep"
          >
            Record purchase
          </Link>
        )}
      </div>

      <div className="overflow-hidden rounded-radius-lg border border-border bg-bg-elevated shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-bg-alt text-left text-text-secondary">
            <tr>
              <th className="px-4 py-3 font-medium">Vendor</th>
              <th className="px-4 py-3 font-medium">Invoice</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-text-secondary">
                  Loading...
                </td>
              </tr>
            ) : purchases.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-text-secondary">
                  No purchases yet.
                </td>
              </tr>
            ) : (
              purchases.map((p) => (
                <tr key={p.id} className="border-b border-divider last:border-0 hover:bg-bg-alt">
                  <td className="px-4 py-3">
                    <Link to={`/purchases/${p.id}`} className="font-medium text-brand-red hover:underline">
                      {p.vendor}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-text-primary">{p.invoice_number ?? '—'}</td>
                  <td className="px-4 py-3 text-text-secondary">{p.purchase_date}</td>
                  <td className="px-4 py-3 text-text-primary">
                    {p.currency} {p.amount.toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
