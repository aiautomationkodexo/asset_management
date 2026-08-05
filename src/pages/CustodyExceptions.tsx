import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Assignment } from '@/types/custody'

interface ExceptionRow extends Assignment {
  assets: { asset_tag: string } | null
  employees: { name: string } | null
}

export function CustodyExceptions() {
  const [rows, setRows] = useState<ExceptionRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    supabase
      .from('assignments')
      .select('*, assets(asset_tag), employees(name)')
      .is('returned_at', null)
      .is('signature_data_url', null)
      .lt('assigned_at', cutoff)
      .order('assigned_at')
      .then(({ data }) => {
        setRows((data ?? []) as unknown as ExceptionRow[])
        setIsLoading(false)
      })
  }, [])

  return (
    <div className="p-8">
      <h1 className="mb-2 text-3xl">Acknowledgment exceptions</h1>
      <p className="mb-6 text-sm text-text-secondary">Assignments still unsigned for more than 3 days.</p>

      <div className="max-w-2xl overflow-hidden rounded-radius-lg border border-border bg-bg-elevated shadow-sm">
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
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-text-secondary">
                  Loading...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-text-secondary">
                  No exceptions.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const days = Math.floor((Date.now() - new Date(r.assigned_at).getTime()) / (24 * 60 * 60 * 1000))
                return (
                  <tr key={r.id} className="border-b border-divider last:border-0">
                    <td className="px-4 py-3">
                      <Link to={`/assets/${r.asset_id}`} className="text-brand-red hover:underline">
                        <code>{r.assets?.asset_tag}</code>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-text-primary">{r.employees?.name}</td>
                    <td className="px-4 py-3 text-text-secondary">{new Date(r.assigned_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-warning-text">{days}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
