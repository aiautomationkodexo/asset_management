import { useEffect, useState } from 'react'
import { Wrench, Pencil } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { MaintenanceLog, MaintenanceLogType } from '@/types/maintenance'
import { MAINTENANCE_LOG_TYPES } from '@/types/maintenance'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { buttonClass } from '@/components/ui/buttonStyles'
import { sentenceCase } from '@/lib/utils'
import { ASSET_STATUS_LABELS } from '@/lib/assetStatusStyle'

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
  const [editingId, setEditingId] = useState<string | null>(null)
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

  function closeForm() {
    setOpen(false)
    setEditingId(null)
    setLogType('repair')
    setVendor('')
    setCost('0')
    setDowntimeDays('')
    setDescription('')
    setStillOpen(true)
  }

  function startAdd() {
    closeForm()
    setOpen(true)
  }

  function startEdit(log: MaintenanceLog) {
    setEditingId(log.id)
    setLogType(log.type)
    setVendor(log.vendor_name ?? '')
    setCost(String(log.cost))
    setDowntimeDays(log.downtime_days != null ? String(log.downtime_days) : '')
    setDescription(log.description ?? '')
    setStillOpen(!log.resolved_at)
    setOpen(true)
  }

  async function handleSubmit() {
    setIsSaving(true)
    setError(null)
    const payload = {
      type: logType,
      vendor_name: vendor || null,
      cost: Number(cost) || 0,
      downtime_days: downtimeDays ? Number(downtimeDays) : null,
      description: description || null,
      resolved_at: stillOpen ? null : new Date().toISOString(),
    }
    const { error: saveError } = editingId
      ? await supabase.from('maintenance_logs').update(payload).eq('id', editingId)
      : await supabase.from('maintenance_logs').insert({ asset_id: assetId, ...payload })
    setIsSaving(false)
    if (saveError) {
      setError(saveError.message)
      return
    }
    closeForm()
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
          <button onClick={startAdd} className={buttonClass('tertiary')}>
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
          <h3 className="text-body-xs font-medium uppercase tracking-wide text-text-tertiary">
            {editingId ? 'Edit maintenance log' : 'New maintenance log'}
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select value={logType} onChange={(e) => setLogType(e.target.value as MaintenanceLogType)}>
              {MAINTENANCE_LOG_TYPES.map((t) => (
                <option key={t} value={t}>
                  {sentenceCase(t)}
                </option>
              ))}
            </Select>
            <Input placeholder="Vendor" value={vendor} onChange={(e) => setVendor(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            Still open (asset stays {ASSET_STATUS_LABELS.in_repair})
          </label>
          {error && <p className="text-sm text-error-text">{error}</p>}
          <div className="flex gap-3">
            <button onClick={handleSubmit} disabled={isSaving} className={buttonClass('primary')}>
              {isSaving ? 'Saving...' : editingId ? 'Save changes' : 'Save log'}
            </button>
            <button onClick={closeForm} className={buttonClass('tertiary')}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {logs.length > 0 ? (
        <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-b border-divider last:border-0">
                <td className="py-1.5 pr-3 text-text-secondary">{l.log_date}</td>
                <td className="py-1.5 pr-3 capitalize text-text-primary">
                  {l.type}
                  {l.auto_created && !l.vendor_name && (
                    <span className="ml-2 text-body-xs font-normal text-warning-text">Needs details</span>
                  )}
                </td>
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
                {isAdmin && (
                  <td className="py-1.5 pl-2 text-right">
                    <button
                      onClick={() => startEdit(l)}
                      aria-label="Edit maintenance log"
                      className="text-text-secondary hover:text-brand-red"
                    >
                      <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      ) : (
        <p className="text-sm text-text-secondary">No maintenance logged.</p>
      )}
    </Card>
  )
}
