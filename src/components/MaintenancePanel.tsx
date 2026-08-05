import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { MaintenanceLog, MaintenanceLogType } from '@/types/maintenance'
import { MAINTENANCE_LOG_TYPES } from '@/types/maintenance'

const FIELD_CLASS = 'w-full rounded-radius-md border border-border bg-bg px-3 py-2 text-sm text-text-primary'

export function MaintenancePanel({
  assetId,
  purchaseCostBase,
  isAdmin,
  onChanged,
}: {
  assetId: string
  purchaseCostBase: number | null
  isAdmin: boolean
  onChanged: () => void
}) {
  const [logs, setLogs] = useState<MaintenanceLog[]>([])
  const [threshold, setThreshold] = useState(40)
  const [open, setOpen] = useState(false)
  const [logType, setLogType] = useState<MaintenanceLogType>('repair')
  const [vendor, setVendor] = useState('')
  const [cost, setCost] = useState('0')
  const [downtimeHours, setDowntimeHours] = useState('')
  const [description, setDescription] = useState('')
  const [stillOpen, setStillOpen] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  function load() {
    supabase
      .from('maintenance_logs')
      .select('*')
      .eq('asset_id', assetId)
      .order('log_date', { ascending: false })
      .then(({ data }) => setLogs((data ?? []) as MaintenanceLog[]))
    supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'maintenance_flag_threshold_percent')
      .maybeSingle()
      .then(({ data }) => {
        if (data) setThreshold(Number(data.value))
      })
  }

  useEffect(load, [assetId])

  const totalSpend = logs.reduce((sum, l) => sum + l.cost, 0)
  const spendPercent = purchaseCostBase ? (totalSpend / purchaseCostBase) * 100 : 0
  const flagged = purchaseCostBase != null && spendPercent >= threshold

  async function handleSubmit() {
    setIsSaving(true)
    setError(null)
    const { error: insertError } = await supabase.from('maintenance_logs').insert({
      asset_id: assetId,
      log_type: logType,
      vendor: vendor || null,
      cost: Number(cost) || 0,
      downtime_hours: downtimeHours ? Number(downtimeHours) : null,
      description: description || null,
      resolved_at: stillOpen ? null : new Date().toISOString(),
    })
    setIsSaving(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    setOpen(false)
    setVendor('')
    setCost('0')
    setDowntimeHours('')
    setDescription('')
    setStillOpen(true)
    load()
    onChanged()
  }

  async function resolveLog(id: string) {
    await supabase.from('maintenance_logs').update({ resolved_at: new Date().toISOString() }).eq('id', id)
    load()
  }

  return (
    <div className="card-in mb-6 max-w-lg rounded-radius-lg border border-border bg-bg-elevated p-6 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl">Maintenance</h2>
        {isAdmin && !open && (
          <button onClick={() => setOpen(true)} className="text-sm text-brand-red hover:underline">
            Log maintenance
          </button>
        )}
      </div>

      <p className="mb-3 text-sm text-text-secondary">
        Cumulative spend: <span className="font-medium text-text-primary">{totalSpend.toFixed(2)}</span>
        {purchaseCostBase != null && ` (${spendPercent.toFixed(0)}% of cost)`}
        {flagged && <span className="ml-2 text-warning-text">⚠ crosses {threshold}% threshold</span>}
      </p>

      {open && (
        <div className="mb-4 space-y-2 border-b border-divider pb-4">
          <div className="grid grid-cols-2 gap-2">
            <select value={logType} onChange={(e) => setLogType(e.target.value as MaintenanceLogType)} className={FIELD_CLASS}>
              {MAINTENANCE_LOG_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input placeholder="Vendor" value={vendor} onChange={(e) => setVendor(e.target.value)} className={FIELD_CLASS} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              step="0.01"
              placeholder="Cost"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className={FIELD_CLASS}
            />
            <input
              type="number"
              step="0.5"
              placeholder="Downtime (hours)"
              value={downtimeHours}
              onChange={(e) => setDowntimeHours(e.target.value)}
              className={FIELD_CLASS}
            />
          </div>
          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={FIELD_CLASS}
          />
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input type="checkbox" checked={stillOpen} onChange={(e) => setStillOpen(e.target.checked)} />
            Still open (asset stays in_repair)
          </label>
          {error && <p className="text-sm text-error-text">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={isSaving}
              className="rounded-radius-md bg-brand-red px-4 py-2 text-sm font-medium text-text-on-brand hover:bg-brand-red-deep disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save log'}
            </button>
            <button onClick={() => setOpen(false)} className="text-sm text-text-secondary hover:underline">
              Cancel
            </button>
          </div>
        </div>
      )}

      {logs.length > 0 ? (
        <table className="w-full text-sm">
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-b border-divider last:border-0">
                <td className="py-1 pr-3 text-text-secondary">{l.log_date}</td>
                <td className="py-1 pr-3 capitalize text-text-primary">{l.log_type}</td>
                <td className="py-1 pr-3 text-text-primary">{l.cost.toFixed(2)}</td>
                <td className="py-1">
                  {l.resolved_at ? (
                    'Resolved'
                  ) : isAdmin ? (
                    <button onClick={() => resolveLog(l.id)} className="text-brand-red hover:underline">
                      Mark resolved
                    </button>
                  ) : (
                    'Open'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-text-secondary">No maintenance logged.</p>
      )}
    </div>
  )
}
