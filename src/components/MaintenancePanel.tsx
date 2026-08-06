import { useEffect, useState } from 'react'
import { Wrench } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { MaintenanceLog, MaintenanceLogType } from '@/types/maintenance'
import { MAINTENANCE_LOG_TYPES } from '@/types/maintenance'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { buttonClass } from '@/components/ui/buttonStyles'

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
  const [downtimeDays, setDowntimeDays] = useState('')
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
      type: logType,
      vendor_name: vendor || null,
      cost: Number(cost) || 0,
      downtime_days: downtimeDays ? Number(downtimeDays) : null,
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
    setDowntimeDays('')
    setDescription('')
    setStillOpen(true)
    load()
    onChanged()
  }

  async function resolveLog(id: string) {
    await supabase.from('maintenance_logs').update({ resolved_at: new Date().toISOString() }).eq('id', id)
    await supabase.from('assets').update({ status: 'in_stock' }).eq('id', assetId).eq('status', 'in_repair')
    load()
    onChanged()
  }

  return (
    <Card className="card-in p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-h6">Maintenance</h2>
        {isAdmin && !open && (
          <button onClick={() => setOpen(true)} className={buttonClass('tertiary')}>
            <Wrench className="h-4 w-4" strokeWidth={1.75} />
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
        <div className="mb-4 space-y-3 border-t border-divider pt-4">
          <div className="grid grid-cols-2 gap-3">
            <Select value={logType} onChange={(e) => setLogType(e.target.value as MaintenanceLogType)}>
              {MAINTENANCE_LOG_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
            <Input placeholder="Vendor" value={vendor} onChange={(e) => setVendor(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              step="0.01"
              placeholder="Cost"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
            <Input
              type="number"
              step="1"
              placeholder="Downtime (days)"
              value={downtimeDays}
              onChange={(e) => setDowntimeDays(e.target.value)}
            />
          </div>
          <Textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input type="checkbox" checked={stillOpen} onChange={(e) => setStillOpen(e.target.checked)} />
            Still open (asset stays in_repair)
          </label>
          {error && <p className="text-sm text-error-text">{error}</p>}
          <div className="flex gap-3">
            <button onClick={handleSubmit} disabled={isSaving} className={buttonClass('primary')}>
              {isSaving ? 'Saving...' : 'Save log'}
            </button>
            <button onClick={() => setOpen(false)} className={buttonClass('tertiary')}>
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
                <td className="py-1.5 pr-3 text-text-secondary">{l.log_date}</td>
                <td className="py-1.5 pr-3 capitalize text-text-primary">{l.type}</td>
                <td className="py-1.5 pr-3 text-text-primary">{l.cost.toFixed(2)}</td>
                <td className="py-1.5">
                  {l.resolved_at ? (
                    <span className="text-text-secondary">Resolved</span>
                  ) : isAdmin ? (
                    <button onClick={() => resolveLog(l.id)} className="font-medium text-brand-red hover:underline">
                      Mark resolved
                    </button>
                  ) : (
                    <span className="text-text-secondary">Open</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-text-secondary">No maintenance logged.</p>
      )}
    </Card>
  )
}
