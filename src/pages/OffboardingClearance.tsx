import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { jsPDF } from 'jspdf'
import { supabase } from '@/lib/supabase'
import type { ClearanceItemStatus, OffboardingClearanceItemWithAsset } from '@/types/custody'
import { useSimpleAuth } from '@/contexts/SimpleAuthContext'

interface ClearanceInfo {
  id: string
  status: string
  created_at: string
  completed_at: string | null
  employee_id: string
}

export function OffboardingClearance() {
  const { isAdmin } = useSimpleAuth()
  const { id } = useParams()
  const [clearance, setClearance] = useState<ClearanceInfo | null>(null)
  const [employeeName, setEmployeeName] = useState('')
  const [items, setItems] = useState<OffboardingClearanceItemWithAsset[]>([])
  const [isLoading, setIsLoading] = useState(true)

  function load() {
    if (!id) return
    supabase
      .from('offboarding_clearances')
      .select('id, status, created_at, completed_at, employee_id')
      .eq('id', id)
      .single()
      .then(async ({ data }) => {
        if (data) {
          setClearance(data)
          const { data: emp } = await supabase.from('employees').select('name').eq('id', data.employee_id).single()
          setEmployeeName(emp?.name ?? '')
        }
        const { data: itemRows } = await supabase
          .from('offboarding_clearance_items')
          .select('*, assignments(asset_id, assets(asset_tag))')
          .eq('clearance_id', id)
        setItems((itemRows ?? []) as unknown as OffboardingClearanceItemWithAsset[])
        setIsLoading(false)
      })
  }

  useEffect(load, [id])

  async function updateItem(itemId: string, status: ClearanceItemStatus, notes: string) {
    const item = items.find((i) => i.id === itemId)
    await supabase.from('offboarding_clearance_items').update({ status, notes: notes || null }).eq('id', itemId)

    // Marking an item resolved must actually close the underlying
    // assignment — clearance completeness is derived from real open
    // assignments, not from this item's status flag alone.
    if (item && status !== 'pending') {
      await supabase
        .from('assignments')
        .update({
          returned_at: new Date().toISOString(),
          received_by: 'offboarding',
          damage_notes: notes || (status === 'lost' ? 'Marked lost during offboarding' : null),
        })
        .eq('id', item.assignment_id)
        .is('returned_at', null)

      const assetId = item.assignments?.asset_id
      if (assetId) {
        await supabase.from('assets').update({ status: status === 'lost' ? 'lost' : 'in_stock' }).eq('id', assetId)
      }
    }
    load()
  }

  function exportPdf() {
    if (!clearance) return
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text('Offboarding Clearance Certificate', 14, 20)
    doc.setFontSize(11)
    doc.text(`Employee: ${employeeName}`, 14, 32)
    doc.text(`Status: ${clearance.status}`, 14, 39)
    doc.text(`Created: ${new Date(clearance.created_at).toLocaleDateString()}`, 14, 46)
    if (clearance.completed_at) {
      doc.text(`Cleared on: ${new Date(clearance.completed_at).toLocaleDateString()}`, 14, 53)
    }

    let y = 65
    doc.text('Item', 14, y)
    doc.text('Status', 100, y)
    doc.text('Notes', 140, y)
    y += 6
    for (const item of items) {
      doc.text(item.assignments?.assets?.asset_tag ?? '—', 14, y)
      doc.text(item.status, 100, y)
      doc.text(item.notes ?? '—', 140, y)
      y += 7
    }

    doc.save(`${employeeName.replace(/\s+/g, '-')}-clearance.pdf`)
  }

  if (isLoading || !clearance) return <div className="p-8 text-text-secondary">Loading...</div>

  const pendingCount = items.filter((i) => i.status === 'pending').length

  return (
    <div className="p-8">
      <h1 className="mb-2 text-3xl">Offboarding clearance</h1>
      <p className="mb-6 text-sm text-text-secondary">
        {employeeName} —{' '}
        <span className={clearance.status === 'complete' ? 'text-success-text' : 'text-warning-text'}>
          {clearance.status}
        </span>
        {clearance.status !== 'complete' && ` (${pendingCount} item${pendingCount === 1 ? '' : 's'} pending)`}
      </p>

      <div className="mb-6 max-w-2xl overflow-hidden rounded-radius-lg border border-border bg-bg-elevated shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-bg-alt text-left text-text-secondary">
            <tr>
              <th className="px-4 py-3 font-medium">Asset</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <ClearanceItemRow key={item.id} item={item} isAdmin={isAdmin} onSave={updateItem} />
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={exportPdf}
        className="rounded-radius-md border border-border bg-bg-alt px-4 py-2 text-sm font-medium text-text-primary hover:bg-border"
      >
        Export PDF
      </button>
    </div>
  )
}

function ClearanceItemRow({
  item,
  isAdmin,
  onSave,
}: {
  item: OffboardingClearanceItemWithAsset
  isAdmin: boolean
  onSave: (id: string, status: ClearanceItemStatus, notes: string) => void
}) {
  const [status, setStatus] = useState<ClearanceItemStatus>(item.status)
  const [notes, setNotes] = useState(item.notes ?? '')

  return (
    <tr className="border-b border-divider last:border-0">
      <td className="px-4 py-3 text-text-primary">
        <code>{item.assignments?.assets?.asset_tag ?? '—'}</code>
      </td>
      <td className="px-4 py-3">
        <select
          value={status}
          disabled={!isAdmin}
          onChange={(e) => {
            const next = e.target.value as ClearanceItemStatus
            setStatus(next)
            onSave(item.id, next, notes)
          }}
          className="rounded-radius-md border border-border bg-bg px-2 py-1 text-sm text-text-primary disabled:opacity-60"
        >
          <option value="pending">Pending</option>
          <option value="returned">Returned</option>
          <option value="lost">Lost</option>
        </select>
      </td>
      <td className="px-4 py-3">
        <input
          value={notes}
          disabled={!isAdmin}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => onSave(item.id, status, notes)}
          className="w-full rounded-radius-md border border-border bg-bg px-2 py-1 text-sm text-text-primary disabled:opacity-60"
        />
      </td>
    </tr>
  )
}
