import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ScanLine } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { AuditSession } from '@/types/audit'
import type { Location } from '@/types/asset'
import { useSimpleAuth } from '@/contexts/SimpleAuthContext'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { EmptyState } from '@/components/ui/EmptyState'
import { buttonClass } from '@/components/ui/buttonStyles'

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
      <PageHeader kicker="Physical count" title="Audit sweeps" />

      {isAdmin && (
        <Card className="card-in mb-6 flex max-w-lg flex-wrap items-end gap-3 p-4">
          <div className="min-w-[200px] flex-1">
            <Label>Scope (optional)</Label>
            <Select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
              <option value="">All locations</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </div>
          <button onClick={startSession} className={buttonClass('primary')}>
            Start session
          </button>
        </Card>
      )}

      <Card className="max-w-2xl overflow-hidden">
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
                <td colSpan={3}>
                  <EmptyState icon={ScanLine} title="No audit sessions yet" description="Start one to begin a physical count." />
                </td>
              </tr>
            ) : (
              sessions.map((s) => (
                <tr key={s.id} className="border-b border-divider last:border-0 hover:bg-bg-alt">
                  <td className="px-4 py-3">
                    <Link to={`/audit/${s.id}`} className="font-medium text-brand-red hover:underline">
                      {new Date(s.started_at).toLocaleString()}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-text-primary">{s.locations?.name ?? 'All locations'}</td>
                  <td className="px-4 py-3">
                    <Badge tone={s.closed_at ? 'neutral' : 'success'}>{s.closed_at ? 'Closed' : 'Open'}</Badge>
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
