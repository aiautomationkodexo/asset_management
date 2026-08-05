import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { AuditSession } from '@/types/audit'
import type { Location } from '@/types/asset'
import { useSimpleAuth } from '@/contexts/SimpleAuthContext'

interface SessionRow extends AuditSession {
  locations: { name: string } | null
}

export function AuditSessionList() {
  const { isAdmin, email } = useSimpleAuth()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [locationId, setLocationId] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  function load() {
    supabase
      .from('audit_sessions')
      .select('*, locations(name)')
      .order('started_at', { ascending: false })
      .then(({ data }) => {
        setSessions((data ?? []) as unknown as SessionRow[])
        setIsLoading(false)
      })
    supabase
      .from('locations')
      .select('id, name, type, parent_id')
      .order('name')
      .then(({ data }) => setLocations(data ?? []))
  }

  useEffect(load, [])

  async function startSession() {
    const { data, error } = await supabase
      .from('audit_sessions')
      .insert({ location_id: locationId || null, created_by: email })
      .select('id')
      .single()
    if (!error && data) navigate(`/audit/${data.id}`)
  }

  return (
    <div className="p-8">
      <h1 className="mb-6 text-3xl">Audit sweeps</h1>

      {isAdmin && (
        <div className="card-in mb-6 flex max-w-lg items-end gap-3 rounded-radius-lg border border-border bg-bg-elevated p-4 shadow-sm">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-text-primary">Scope (optional)</label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="w-full rounded-radius-md border border-border bg-bg px-3 py-2 text-sm text-text-primary"
            >
              <option value="">All locations</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={startSession}
            className="rounded-radius-md bg-brand-red px-4 py-2 text-sm font-medium text-text-on-brand hover:bg-brand-red-deep"
          >
            Start session
          </button>
        </div>
      )}

      <div className="max-w-2xl overflow-hidden rounded-radius-lg border border-border bg-bg-elevated shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-bg-alt text-left text-text-secondary">
            <tr>
              <th className="px-4 py-3 font-medium">Started</th>
              <th className="px-4 py-3 font-medium">Scope</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-text-secondary">
                  Loading...
                </td>
              </tr>
            ) : sessions.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-text-secondary">
                  No audit sessions yet.
                </td>
              </tr>
            ) : (
              sessions.map((s) => (
                <tr key={s.id} className="border-b border-divider last:border-0 hover:bg-bg-alt">
                  <td className="px-4 py-3">
                    <Link to={`/audit/${s.id}`} className="text-brand-red hover:underline">
                      {new Date(s.started_at).toLocaleString()}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-text-primary">{s.locations?.name ?? 'All locations'}</td>
                  <td className="px-4 py-3">{s.closed_at ? 'Closed' : 'Open'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
