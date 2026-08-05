import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { ImportBatch } from '@/types/asset'

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
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl">Import history</h1>
        <Link
          to="/assets/import"
          className="rounded-radius-md bg-brand-red px-4 py-2 text-sm font-medium text-text-on-brand hover:bg-brand-red-deep"
        >
          New import
        </Link>
      </div>

      {error && <p className="mb-4 text-sm text-error-text">{error}</p>}

      <div className="overflow-hidden rounded-radius-lg border border-border bg-bg-elevated shadow-sm">
        <table className="w-full text-sm">
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
                <td colSpan={7} className="px-4 py-6 text-center text-text-secondary">
                  No imports yet.
                </td>
              </tr>
            ) : (
              batches.map((b) => (
                <tr key={b.id} className="border-b border-divider last:border-0">
                  <td className="px-4 py-3 text-text-primary">{b.filename}</td>
                  <td className="px-4 py-3 text-text-secondary">{new Date(b.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-text-primary">{b.total_rows}</td>
                  <td className="px-4 py-3 text-text-primary">{b.inserted_count}</td>
                  <td className="px-4 py-3 text-text-primary">{b.duplicate_count}</td>
                  <td className="px-4 py-3 text-text-primary">{b.error_count}</td>
                  <td className="px-4 py-3">
                    <span className={b.status === 'committed' ? 'text-success-text' : 'text-error-text'}>
                      {b.status}
                    </span>
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
