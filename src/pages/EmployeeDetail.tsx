import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Pencil, PackageCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Employee } from '@/types/employee'
import type { Assignment } from '@/types/custody'
import { useSimpleAuth } from '@/contexts/SimpleAuthContext'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { buttonClass } from '@/components/ui/buttonStyles'
import { sentenceCase } from '@/lib/utils'

export function EmployeeDetail() {
  const { isAdmin } = useSimpleAuth()
  const { id } = useParams()
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [clearanceId, setClearanceId] = useState<string | null>(null)
  const [clearanceStatus, setClearanceStatus] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .single()
      .then(async (empRes) => {
        if (empRes.error || !empRes.data) {
          setError(empRes.error?.message ?? 'Employee not found.')
          setIsLoading(false)
          return
        }
        const emp = empRes.data as Employee
        setEmployee(emp)

        const [assignRes, clearanceRes] = await Promise.all([
          supabase
            .from('assignments')
            .select('*')
            .eq('employee_code', emp.employee_code)
            .order('assigned_at', { ascending: false }),
          supabase
            .from('offboarding_clearances')
            .select('id, status')
            .eq('employee_id', id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ])
        setAssignments((assignRes.data ?? []) as Assignment[])
        if (clearanceRes.data) {
          setClearanceId(clearanceRes.data.id)
          setClearanceStatus(clearanceRes.data.status)
        }
        setIsLoading(false)
      })
  }, [id])

  if (isLoading) return <div className="p-4 sm:p-8 text-text-secondary">Loading...</div>
  if (error || !employee) return <div className="p-4 sm:p-8 text-error-text">{error ?? 'Employee not found.'}</div>

  const openAssignments = assignments.filter((a) => !a.returned_at)

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-h3">{employee.full_name}</h1>
          <p className="text-sm text-text-secondary">
            <code>{employee.employee_code}</code> · {employee.work_email}
          </p>
        </div>
        {isAdmin && (
          <Link to={`/employees/${employee.id}/edit`} className={buttonClass('tertiary')}>
            <Pencil className="h-4 w-4" strokeWidth={1.75} />
            Edit
          </Link>
        )}
      </div>

      {clearanceId && (
        <div className="card-in mb-6 max-w-lg rounded-radius-lg border border-warning-border bg-warning-bg p-4 text-sm">
          <p className="text-warning-text">
            Offboarding clearance: <strong>{clearanceStatus ? sentenceCase(clearanceStatus) : clearanceStatus}</strong>.{' '}
            <Link to={`/offboarding/${clearanceId}`} className="underline">
              View checklist
            </Link>
          </p>
        </div>
      )}

      <Card as="dl" className="card-in mb-6 max-w-lg divide-y divide-divider">
        {(
          [
            ['Department', employee.department ?? '—'],
            ['Designation', employee.designation ?? '—'],
            ['Join date', employee.join_date ?? '—'],
            ['Location', employee.location ?? '—'],
            ['Status', sentenceCase(employee.employment_status)],
          ] as Array<[string, string]>
        ).map(([label, value]) => (
          <div key={label} className="flex justify-between px-4 py-3 text-sm">
            <dt className="text-text-secondary">{label}</dt>
            <dd className="font-medium text-text-primary">{value}</dd>
          </div>
        ))}
      </Card>

      <h2 className="text-h6 mb-3">Currently holding ({openAssignments.length})</h2>
      <Card className="mb-6 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="border-b border-border bg-bg-alt text-left text-text-secondary">
            <tr>
              <th className="px-4 py-3 font-medium">Asset</th>
              <th className="px-4 py-3 font-medium">Assigned</th>
              <th className="px-4 py-3 font-medium">Condition out</th>
              <th className="px-4 py-3 font-medium">Signed</th>
            </tr>
          </thead>
          <tbody>
            {openAssignments.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <EmptyState icon={PackageCheck} title="Nothing currently assigned" />
                </td>
              </tr>
            ) : (
              openAssignments.map((a) => (
                <tr key={a.id} className="border-b border-divider last:border-0 hover:bg-bg-alt">
                  <td className="px-4 py-3">
                    <Link to={`/assets/${a.asset_id}`} className="font-medium text-brand-red hover:underline">
                      <code>{a.asset_tag}</code>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{new Date(a.assigned_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 capitalize text-text-primary">{a.condition_out}</td>
                  <td className="px-4 py-3 text-text-primary">{a.signature_data_url ? 'Yes' : 'No'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </Card>

      <h2 className="text-h6 mb-3">Full assignment history</h2>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="border-b border-border bg-bg-alt text-left text-text-secondary">
            <tr>
              <th className="px-4 py-3 font-medium">Asset</th>
              <th className="px-4 py-3 font-medium">Assigned</th>
              <th className="px-4 py-3 font-medium">Returned</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {assignments.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-4 text-center text-text-secondary">
                  No assignment history.
                </td>
              </tr>
            ) : (
              assignments.map((a) => (
                <tr key={a.id} className="border-b border-divider last:border-0 hover:bg-bg-alt">
                  <td className="px-4 py-3">
                    <Link to={`/assets/${a.asset_id}`} className="font-medium text-brand-red hover:underline">
                      <code>{a.asset_tag}</code>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{new Date(a.assigned_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-text-secondary">
                    {a.returned_at ? new Date(a.returned_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-text-primary">{a.returned_at ? 'Returned' : 'Open'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </Card>
    </div>
  )
}
