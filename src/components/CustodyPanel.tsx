import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRightLeft, PackageCheck, Undo2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { AssetCondition, AssetStatus } from '@/types/asset'
import { ASSET_CONDITIONS } from '@/types/asset'
import type { Assignment } from '@/types/custody'
import { useSimpleAuth } from '@/contexts/SimpleAuthContext'
import { SignaturePad } from '@/components/SignaturePad'
import { Card } from '@/components/ui/Card'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { buttonClass } from '@/components/ui/buttonStyles'

interface EmployeeOption {
  id: string
  full_name: string
  employee_code: string
}

export function CustodyPanel({
  assetId,
  assetTag,
  assetStatus,
  isAdmin,
  onChanged,
}: {
  assetId: string
  assetTag: string
  assetStatus: AssetStatus
  isAdmin: boolean
  onChanged: () => void
}) {
  const { email } = useSimpleAuth()
  const [history, setHistory] = useState<Assignment[]>([])
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [mode, setMode] = useState<'none' | 'assign' | 'return' | 'transfer'>('none')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [employeeCode, setEmployeeCode] = useState('')
  const [condition, setCondition] = useState<AssetCondition>('good')
  const [signature, setSignature] = useState<string | null>(null)
  const [damageNotes, setDamageNotes] = useState('')
  const [returnStatus, setReturnStatus] = useState<'in_stock' | 'in_repair'>('in_stock')

  function load() {
    supabase
      .from('assignments')
      .select('*')
      .eq('asset_id', assetId)
      .order('assigned_at', { ascending: false })
      .then(({ data }) => setHistory((data ?? []) as Assignment[]))
  }

  useEffect(load, [assetId])

  useEffect(() => {
    supabase
      .from('employees')
      .select('id, full_name, employee_code')
      .order('full_name')
      .then(({ data }) => setEmployees((data ?? []) as EmployeeOption[]))
  }, [])

  const openAssignment = history.find((a) => !a.returned_at)
  const openAssignmentEmployeeId = employees.find((e) => e.employee_code === openAssignment?.employee_code)?.id

  function resetForm() {
    setMode('none')
    setEmployeeCode('')
    setCondition('good')
    setSignature(null)
    setDamageNotes('')
    setReturnStatus('in_stock')
    setError(null)
  }

  async function handleAssign() {
    if (!employeeCode) {
      setError('Choose an employee.')
      return
    }
    setIsSaving(true)
    setError(null)
    const employee = employees.find((e) => e.employee_code === employeeCode)
    const { error: insertError } = await supabase.from('assignments').insert({
      asset_id: assetId,
      asset_tag: assetTag,
      employee_code: employeeCode,
      employee_name: employee?.full_name ?? '',
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
    if (!employeeCode) {
      setError('Choose an employee.')
      return
    }
    setIsSaving(true)
    setError(null)
    const { error: rpcError } = await supabase.rpc('transfer_asset', {
      p_asset_id: assetId,
      p_new_employee_code: employeeCode,
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
    <Card className="card-in p-6">
      <h2 className="text-h6 mb-3">Custody</h2>

      {openAssignment ? (
        <p className="mb-3 text-sm text-text-secondary">
          Currently held by{' '}
          <Link to={`/employees/${openAssignmentEmployeeId ?? ''}`} className="font-medium text-brand-red hover:underline">
            {openAssignment.employee_name}
          </Link>{' '}
          since {new Date(openAssignment.assigned_at).toLocaleDateString()}.
        </p>
      ) : (
        <p className="mb-3 text-sm text-text-secondary">No one currently holds this asset.</p>
      )}

      {isAdmin && mode === 'none' && (
        <div className="flex flex-wrap gap-3">
          {assetStatus === 'in_stock' && (
            <button onClick={() => setMode('assign')} className={buttonClass('primary')}>
              <PackageCheck className="h-4 w-4" strokeWidth={1.75} />
              Assign
            </button>
          )}
          {assetStatus === 'assigned' && openAssignment && (
            <>
              <button onClick={() => setMode('return')} className={buttonClass('primary')}>
                <Undo2 className="h-4 w-4" strokeWidth={1.75} />
                Return
              </button>
              <button onClick={() => setMode('transfer')} className={buttonClass('tertiary')}>
                <ArrowRightLeft className="h-4 w-4" strokeWidth={1.75} />
                Transfer
              </button>
            </>
          )}
        </div>
      )}

      {mode === 'assign' && (
        <div className="mt-4 space-y-4 border-t border-divider pt-4">
          <div>
            <Label>Employee</Label>
            <Select value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)}>
              <option value="">Select employee</option>
              {employees.map((emp) => (
                <option key={emp.employee_code} value={emp.employee_code}>
                  {emp.full_name} ({emp.employee_code})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Condition going out</Label>
            <Select value={condition} onChange={(e) => setCondition(e.target.value as AssetCondition)}>
              {ASSET_CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Signature</Label>
            <SignaturePad value={signature} onChange={setSignature} />
          </div>
          {error && <p className="text-sm text-error-text">{error}</p>}
          <div className="flex gap-3">
            <button onClick={handleAssign} disabled={isSaving} className={buttonClass('primary')}>
              {isSaving ? 'Saving...' : 'Confirm assign'}
            </button>
            <button onClick={resetForm} className={buttonClass('tertiary')}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {mode === 'return' && (
        <div className="mt-4 space-y-4 border-t border-divider pt-4">
          <div>
            <Label>Condition coming back</Label>
            <Select value={condition} onChange={(e) => setCondition(e.target.value as AssetCondition)}>
              {ASSET_CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Damage notes</Label>
            <Textarea value={damageNotes} onChange={(e) => setDamageNotes(e.target.value)} rows={2} />
          </div>
          <div>
            <Label>Resulting status</Label>
            <Select value={returnStatus} onChange={(e) => setReturnStatus(e.target.value as 'in_stock' | 'in_repair')}>
              <option value="in_stock">In stock</option>
              <option value="in_repair">In repair</option>
            </Select>
          </div>
          {error && <p className="text-sm text-error-text">{error}</p>}
          <div className="flex gap-3">
            <button onClick={handleReturn} disabled={isSaving} className={buttonClass('primary')}>
              {isSaving ? 'Saving...' : 'Confirm return'}
            </button>
            <button onClick={resetForm} className={buttonClass('tertiary')}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {mode === 'transfer' && (
        <div className="mt-4 space-y-4 border-t border-divider pt-4">
          <div>
            <Label>New employee</Label>
            <Select value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)}>
              <option value="">Select employee</option>
              {employees.map((emp) => (
                <option key={emp.employee_code} value={emp.employee_code}>
                  {emp.full_name} ({emp.employee_code})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Condition at transfer</Label>
            <Select value={condition} onChange={(e) => setCondition(e.target.value as AssetCondition)}>
              {ASSET_CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>New signature</Label>
            <SignaturePad value={signature} onChange={setSignature} />
          </div>
          {error && <p className="text-sm text-error-text">{error}</p>}
          <div className="flex gap-3">
            <button onClick={handleTransfer} disabled={isSaving} className={buttonClass('primary')}>
              {isSaving ? 'Saving...' : 'Confirm transfer'}
            </button>
            <button onClick={resetForm} className={buttonClass('tertiary')}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-5 border-t border-divider pt-4">
          <h3 className="mb-2 text-body-xs font-medium uppercase tracking-wide text-text-tertiary">
            Assignment history
          </h3>
          <table className="w-full text-sm">
            <tbody>
              {history.map((a) => (
                <tr key={a.id} className="border-b border-divider last:border-0">
                  <td className="py-1.5 pr-3 text-text-primary">{a.employee_name}</td>
                  <td className="py-1.5 pr-3 text-text-secondary">{new Date(a.assigned_at).toLocaleDateString()}</td>
                  <td className="py-1.5 text-text-secondary">
                    {a.returned_at ? `Returned ${new Date(a.returned_at).toLocaleDateString()}` : 'Open'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
