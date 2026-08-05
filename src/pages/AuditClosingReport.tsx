import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Download } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { AuditSession } from '@/types/audit'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { buttonClass } from '@/components/ui/buttonStyles'

interface AssetRow {
  id: string
  asset_tag: string
  location_id: string | null
}

export function AuditClosingReport() {
  const { id } = useParams()
  const [session, setSession] = useState<AuditSession | null>(null)
  const [found, setFound] = useState<AssetRow[]>([])
  const [missing, setMissing] = useState<AssetRow[]>([])
  const [wrongPlace, setWrongPlace] = useState<AssetRow[]>([])
  const [unregistered, setUnregistered] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  function load() {
    if (!id) return
    Promise.all([
      supabase.from('audit_sessions').select('*').eq('id', id).single(),
      supabase.from('audit_scans').select('scanned_slug, asset_id, assets(id, asset_tag, location_id)').eq('session_id', id),
    ]).then(async ([sessRes, scansRes]) => {
      const sess = sessRes.data as AuditSession
      setSession(sess)

      let expectedQuery = supabase.from('assets').select('id, asset_tag, location_id').is('deleted_at', null).neq('status', 'disposed')
      if (sess.location_id) expectedQuery = expectedQuery.eq('location_id', sess.location_id)
      const { data: expected } = await expectedQuery

      const scanRows = (scansRes.data ?? []) as unknown as Array<{
        scanned_slug: string
        asset_id: string | null
        assets: AssetRow | null
      }>

      const scannedIds = new Set(scanRows.filter((s) => s.asset_id).map((s) => s.asset_id))
      const expectedList = (expected ?? []) as AssetRow[]

      setFound(expectedList.filter((a) => scannedIds.has(a.id)))
      setMissing(expectedList.filter((a) => !scannedIds.has(a.id)))
      setWrongPlace(
        sess.location_id
          ? scanRows
              .filter((s) => s.assets && s.assets.location_id !== sess.location_id)
              .map((s) => s.assets!)
          : []
      )
      setUnregistered(Array.from(new Set(scanRows.filter((s) => !s.asset_id).map((s) => s.scanned_slug))))
      setIsLoading(false)
    })
  }

  useEffect(load, [id])

  async function fixWrongPlace() {
    if (!session?.location_id) return
    await supabase
      .from('assets')
      .update({ location_id: session.location_id })
      .in('id', wrongPlace.map((a) => a.id))
    setMessage(`Moved ${wrongPlace.length} asset(s) to the session location.`)
    load()
  }

  function exportCsv() {
    const lines = ['section,asset_tag']
    found.forEach((a) => lines.push(`found,${a.asset_tag}`))
    missing.forEach((a) => lines.push(`missing,${a.asset_tag}`))
    wrongPlace.forEach((a) => lines.push(`found_in_wrong_place,${a.asset_tag}`))
    unregistered.forEach((slug) => lines.push(`scanned_but_not_registered,${slug}`))
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `audit-report-${id}.csv`
    link.click()
  }

  if (isLoading) return <div className="p-8 text-text-secondary">Loading...</div>

  return (
    <div className="p-8">
      <PageHeader
        kicker="Audit"
        title="Closing report"
        actions={
          <>
            <Link to={`/audit/${id}`} className="text-sm font-medium text-brand-red hover:underline">
              Back to session
            </Link>
            <button onClick={exportCsv} className={buttonClass('tertiary')}>
              <Download className="h-4 w-4" strokeWidth={1.75} />
              Export CSV
            </button>
          </>
        }
      />

      {message && <p className="mb-4 text-sm text-success-text">{message}</p>}

      <div className="grid gap-6 sm:grid-cols-2">
        <ReportSection title={`Found (${found.length})`} items={found.map((a) => a.asset_tag)} tone="success" />
        <ReportSection title={`Missing (${missing.length})`} items={missing.map((a) => a.asset_tag)} tone="error" />
        <div>
          <ReportSection
            title={`Found in wrong place (${wrongPlace.length})`}
            items={wrongPlace.map((a) => a.asset_tag)}
            tone="warning"
          />
          {wrongPlace.length > 0 && (
            <button onClick={fixWrongPlace} className="mt-2 text-sm font-medium text-brand-red hover:underline">
              Move all to session location
            </button>
          )}
        </div>
        <ReportSection
          title={`Scanned but not registered (${unregistered.length})`}
          items={unregistered}
          tone="error"
        />
      </div>
    </div>
  )
}

function ReportSection({ title, items, tone }: { title: string; items: string[]; tone: 'success' | 'error' | 'warning' }) {
  const toneClass = { success: 'text-success-text', error: 'text-error-text', warning: 'text-warning-text' }[tone]
  return (
    <Card className="p-4">
      <h3 className={`mb-2 text-sm font-medium ${toneClass}`}>{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-text-secondary">None.</p>
      ) : (
        <ul className="max-h-40 space-y-0.5 overflow-auto text-sm text-text-primary">
          {items.map((i) => (
            <li key={i}>
              <code>{i}</code>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
