import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, History } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { ImportBatch } from '@/types/asset'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { buttonClass } from '@/components/ui/buttonStyles'
import { sentenceCase } from '@/lib/utils'

export function ImportHistory() {
  const [batches, setBatches] = useState<ImportBatch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('import_batches')
      .select('id, filename, total_rows, inserted_count, error_count, duplicate_count, status, error_message, created_at')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          setError(error.message)
        } else {
          setBatches((data ?? []) as ImportBatch[])
        }
        setIsLoading(false)
      })
  }, [])

  return (
    <div className="p-4 sm:p-8">
      <PageHeader
        kicker="Register"
        title="Import history"
        actions={
          <Link to="/assets/import" className={buttonClass('primary')}>
            <Plus className="h-4 w-4" strokeWidth={1.75} />
            New import
          </Link>
        }
      />

      {error && <p className="mb-4 text-sm text-error-text">{error}</p>}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-border bg-bg-alt text-left text-text-secondary">
            <tr>
              <th className="px-4 py-3 font-medium">File</th>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Inserted</th>
              <th className="px-4 py-3 font-medium">Duplicates</th>
              <th className="px-4 py-3 font-medium">Errors</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-text-secondary">
                  Loading...
                </td>
              </tr>
            ) : batches.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <EmptyState icon={History} title="No imports yet" />
                </td>
              </tr>
            ) : (
              batches.map((b) => (
                <tr key={b.id} className="border-b border-divider last:border-0 hover:bg-bg-alt">
                  <td className="px-4 py-3 text-text-primary">{b.filename}</td>
                  <td className="px-4 py-3 text-text-secondary">{new Date(b.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-text-primary">{b.total_rows}</td>
                  <td className="px-4 py-3 text-text-primary">{b.inserted_count}</td>
                  <td className="px-4 py-3 text-text-primary">{b.duplicate_count}</td>
                  <td className="px-4 py-3 text-text-primary">{b.error_count}</td>
                  <td className="px-4 py-3">
                    <Badge tone={b.status === 'committed' ? 'success' : 'error'}>{sentenceCase(b.status)}</Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </Card>
    </div>
  )
}
