import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Assignment } from '@/types/custody'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

export function CustodyExceptions() {
  const [rows, setRows] = useState<Assignment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    supabase
      .from('assignments')
      .select('*')
      .is('returned_at', null)
      .is('signature_data_url', null)
      .lt('assigned_at', cutoff)
      .order('assigned_at')
      .then(({ data }) => {
        setRows((data ?? []) as Assignment[])
        setIsLoading(false)
      })
  }, [])

  return (
    <div className="p-8">
      <PageHeader kicker="Assign/Return" title="Acknowledgment exceptions" subtitle="Assignments still unsigned for more than 3 days." />

      <Card className="max-w-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-bg-alt text-left text-text-secondary">
            <tr>
              <th className="px-4 py-3 font-medium">Asset</th>
              <th className="px-4 py-3 font-medium">Employee</th>
              <th className="px-4 py-3 font-medium">Assigned</th>
              <th className="px-4 py-3 font-medium">Days unsigned</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-divider last:border-0">
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-20" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-20" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-8" />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <EmptyState icon={CheckCircle2} title="No exceptions" description="Every open assignment has been acknowledged." />
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const days = Math.floor((Date.now() - new Date(r.assigned_at).getTime()) / (24 * 60 * 60 * 1000))
                return (
                  <tr key={r.id} className="border-b border-divider last:border-0 hover:bg-bg-alt">
                    <td className="px-4 py-3">
                      <Link to={`/assets/${r.asset_id}`} className="font-medium text-brand-red hover:underline">
                        <code>{r.asset_tag}</code>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-text-primary">{r.employee_name}</td>
                    <td className="px-4 py-3 text-text-secondary">{new Date(r.assigned_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-medium text-warning-text">{days}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
