import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Purchase } from '@/types/finance'
import { useSimpleAuth } from '@/contexts/SimpleAuthContext'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { buttonClass } from '@/components/ui/buttonStyles'

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
      <PageHeader
        kicker="Finance"
        title="Purchases"
        actions={
          isAdmin && (
            <Link to="/purchases/new" className={buttonClass('primary')}>
              <Plus className="h-4 w-4" strokeWidth={1.75} />
              Record purchase
            </Link>
          )
        }
      />

      <Card className="overflow-hidden">
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
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-divider last:border-0">
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-16" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-20" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-20" />
                  </td>
                </tr>
              ))
            ) : purchases.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <EmptyState icon={ShoppingCart} title="No purchases yet" description="Record the first purchase to link it to assets." />
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
      </Card>
    </div>
  )
}
