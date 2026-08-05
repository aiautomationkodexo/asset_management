import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { AssetCondition, AssetStatus } from '@/types/asset'
import { ASSET_CONDITIONS } from '@/types/asset'
import type { Assignment } from '@/types/custody'
import { useSimpleAuth } from '@/contexts/SimpleAuthContext'
import { SignaturePad } from '@/components/SignaturePad'

interface EmployeeOption {
  id: string
  name: string
  employee_code: string
}

interface AssignmentRow extends Assignment {
  employees: { name: string } | null
}

const FIELD_CLASS = 'w-full rounded-radius-md border border-border bg-bg px-3 py-2 text-sm text-text-primary'
const LABEL_CLASS = 'mb-1 block text-sm font-medium text-text-primary'

export function CustodyPanel({
  assetId,
  assetStatus,
  isAdmin,
  onChanged,
}: {
  assetId: string
  assetStatus: AssetStatus
  isAdmin: boolean
  onChanged: () => void
}) {
  const { email } = useSimpleAuth()
  const [history, setHistory] = useState<AssignmentRow[]>([])
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [mode, setMode] = useState<'none' | 'assign' | 'return' | 'transfer'>('none')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [employeeId, setEmployeeId] = useState('')
  const [condition, setCondition] = useState<AssetCondition>('good')
  const [signature, setSignature] = useState<string | null>(null)
  const [damageNotes, setDamageNotes] = useState('')
  const [returnStatus, setReturnStatus] = useState<'in_stock' | 'in_repair'>('in_stock')

  function load() {
    supabase
      .from('assignments')
      .select('*, employees(name)')
      .eq('asset_id', assetId)
      .order('assigned_at', { ascending: false })
      .then(({ data }) => setHistory((data ?? []) as unknown as AssignmentRow[]))
  }

  useEffect(load, [assetId])

  useEffect(() => {
    if (!isAdmin) return
    supabase
      .from('employees')
      .select('id, name, employee_code')
      .order('name')
      .then(({ data }) => setEmployees((data ?? []) as EmployeeOption[]))
  }, [isAdmin])

  const openAssignment = history.find((a) => !a.returned_at)

  function resetForm() {
    setMode('none')
    setEmployeeId('')
    setCondition('good')
    setSignature(null)
    setDamageNotes('')
    setReturnStatus('in_stock')
    setError(null)
  }

  async function handleAssign() {
    if (!employeeId) {
      setError('Choose an employee.')
      return
    }
    setIsSaving(true)
    setError(null)
    const { error: insertError } = await supabase.from('assignments').insert({
      asset_id: assetId,
      employee_id: employeeId,
      condition_out: condition,
      issued_by: email,
      signature_data_url: signature,
    })
    if (!insertError) {
      await supabase.from('assets').update({ status: 'assigned' }).eq('id', assetId)
    }
    setIsSaving(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    resetForm()
    load()
    onChanged()
  }

  async function handleReturn() {
    if (!openAssignment) return
    setIsSaving(true)
    setError(null)
    const { error: updateError } = await supabase
      .from('assignments')
      .update({
        returned_at: new Date().toISOString(),
        condition_in: condition,
        damage_notes: damageNotes || null,
        received_by: email,
      })
      .eq('id', openAssignment.id)
    if (!updateError) {
      // in_repair requires an open maintenance log entry (DB-enforced) —
      // open one here so the status change doesn't get rejected.
      if (returnStatus === 'in_repair') {
        await supabase.from('maintenance_logs').insert({
          asset_id: assetId,
          log_type: 'repair',
          description: damageNotes || 'Opened on return from custody',
        })
      }
      await supabase.from('assets').update({ status: returnStatus }).eq('id', assetId)
    }
    setIsSaving(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    resetForm()
    load()
    onChanged()
  }

  async function handleTransfer() {
    if (!employeeId) {
      setError('Choose an employee.')
      return
    }
    setIsSaving(true)
    setError(null)
    const { error: rpcError } = await supabase.rpc('transfer_asset', {
      p_asset_id: assetId,
      p_new_employee_id: employeeId,
      p_condition: condition,
      p_admin: email,
      p_signature: signature,
    })
    setIsSaving(false)
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    resetForm()
    load()
    onChanged()
  }

  return (
    <div className="card-in mb-6 max-w-lg rounded-radius-lg border border-border bg-bg-elevated p-6 shadow-sm">
      <h2 className="mb-3 text-xl">Custody</h2>

      {openAssignment ? (
        <p className="mb-3 text-sm text-text-secondary">
          Currently held by{' '}
          <Link to={`/employees/${openAssignment.employee_id}`} className="text-brand-red hover:underline">
            {openAssignment.employees?.name}
          </Link>{' '}
          since {new Date(openAssignment.assigned_at).toLocaleDateString()}.
        </p>
      ) : (
        <p className="mb-3 text-sm text-text-secondary">No one currently holds this asset.</p>
      )}

      {isAdmin && mode === 'none' && (
        <div className="flex gap-3">
          {assetStatus === 'in_stock' && (
            <button
              onClick={() => setMode('assign')}
              className="rounded-radius-md border border-border bg-bg-alt px-4 py-2 text-sm font-medium text-text-primary hover:bg-border"
            >
              Assign
            </button>
          )}
          {assetStatus === 'assigned' && openAssignment && (
            <>
              <button
                onClick={() => setMode('return')}
                className="rounded-radius-md border border-border bg-bg-alt px-4 py-2 text-sm font-medium text-text-primary hover:bg-border"
              >
                Return
              </button>
              <button
                onClick={() => setMode('transfer')}
                className="rounded-radius-md border border-border bg-bg-alt px-4 py-2 text-sm font-medium text-text-primary hover:bg-border"
              >
                Transfer
              </button>
            </>
          )}
        </div>
      )}

      {mode === 'assign' && (
        <div className="mt-4 space-y-3">
          <div>
            <label className={LABEL_CLASS}>Employee</label>
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className={FIELD_CLASS}>
              <option value="">Select employee</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.employee_code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL_CLASS}>Condition going out</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as AssetCondition)}
              className={FIELD_CLASS}
            >
              {ASSET_CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL_CLASS}>Signature</label>
            <SignaturePad value={signature} onChange={setSignature} />
          </div>
          {error && <p className="text-sm text-error-text">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={handleAssign}
              disabled={isSaving}
              className="rounded-radius-md bg-brand-red px-4 py-2 text-sm font-medium text-text-on-brand hover:bg-brand-red-deep disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Confirm assign'}
            </button>
            <button onClick={resetForm} className="text-sm text-text-secondary hover:underline">
              Cancel
            </button>
          </div>
        </div>
      )}

      {mode === 'return' && (
        <div className="mt-4 space-y-3">
          <div>
            <label className={LABEL_CLASS}>Condition coming back</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as AssetCondition)}
              className={FIELD_CLASS}
            >
              {ASSET_CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL_CLASS}>Damage notes</label>
            <textarea
              value={damageNotes}
              onChange={(e) => setDamageNotes(e.target.value)}
              rows={2}
              className={FIELD_CLASS}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Resulting status</label>
            <select
              value={returnStatus}
              onChange={(e) => setReturnStatus(e.target.value as 'in_stock' | 'in_repair')}
              className={FIELD_CLASS}
            >
              <option value="in_stock">In stock</option>
              <option value="in_repair">In repair</option>
            </select>
          </div>
          {error && <p className="text-sm text-error-text">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={handleReturn}
              disabled={isSaving}
              className="rounded-radius-md bg-brand-red px-4 py-2 text-sm font-medium text-text-on-brand hover:bg-brand-red-deep disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Confirm return'}
            </button>
            <button onClick={resetForm} className="text-sm text-text-secondary hover:underline">
              Cancel
            </button>
          </div>
        </div>
      )}

      {mode === 'transfer' && (
        <div className="mt-4 space-y-3">
          <div>
            <label className={LABEL_CLASS}>New employee</label>
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className={FIELD_CLASS}>
              <option value="">Select employee</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.employee_code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL_CLASS}>Condition at transfer</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as AssetCondition)}
              className={FIELD_CLASS}
            >
              {ASSET_CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL_CLASS}>New signature</label>
            <SignaturePad value={signature} onChange={setSignature} />
          </div>
          {error && <p className="text-sm text-error-text">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={handleTransfer}
              disabled={isSaving}
              className="rounded-radius-md bg-brand-red px-4 py-2 text-sm font-medium text-text-on-brand hover:bg-brand-red-deep disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Confirm transfer'}
            </button>
            <button onClick={resetForm} className="text-sm text-text-secondary hover:underline">
              Cancel
            </button>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-2 text-sm font-medium text-text-secondary">Assignment history</h3>
          <table className="w-full text-sm">
            <tbody>
              {history.map((a) => (
                <tr key={a.id} className="border-b border-divider last:border-0">
                  <td className="py-1 pr-3 text-text-primary">{a.employees?.name}</td>
                  <td className="py-1 pr-3 text-text-secondary">{new Date(a.assigned_at).toLocaleDateString()}</td>
                  <td className="py-1 text-text-secondary">
                    {a.returned_at ? `Returned ${new Date(a.returned_at).toLocaleDateString()}` : 'Open'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
