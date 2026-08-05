import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { EmployeeWithLocation } from '@/types/employee'
import { EMPLOYMENT_STATUSES } from '@/types/employee'
import { useSimpleAuth } from '@/contexts/SimpleAuthContext'

const STATUS_STYLE: Record<string, string> = {
  active: 'border-success-border bg-success-bg text-success-text',
  notice: 'border-warning-border bg-warning-bg text-warning-text',
  exited: 'border-border bg-n-100 text-text-tertiary',
}

export function EmployeeList() {
  const { isAdmin } = useSimpleAuth()
  const [employees, setEmployees] = useState<EmployeeWithLocation[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsLoading(true)
    let query = supabase
      .from('employees')
      .select('*, locations(name)')
      .order('name')

    if (statusFilter) query = query.eq('employment_status', statusFilter)
    if (search.trim()) {
      const term = search.trim()
      query = query.or(`name.ilike.%${term}%,employee_code.ilike.%${term}%,work_email.ilike.%${term}%`)
    }

    query.then(({ data, error }) => {
      if (error) setError(error.message)
      else setEmployees((data ?? []) as unknown as EmployeeWithLocation[])
      setIsLoading(false)
    })
  }, [search, statusFilter])

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl">Employees</h1>
        {isAdmin && (
          <div className="flex items-center gap-3">
            <Link
              to="/employees/import"
              className="rounded-radius-md border border-border bg-bg-alt px-4 py-2 text-sm font-medium text-text-primary hover:bg-border"
            >
              CSV import
            </Link>
            <Link
              to="/employees/new"
              className="rounded-radius-md bg-brand-red px-4 py-2 text-sm font-medium text-text-on-brand hover:bg-brand-red-deep"
            >
              Add employee
            </Link>
          </div>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search code, name, email..."
          className="w-64 rounded-radius-md border border-border bg-bg px-3 py-2 text-sm text-text-primary"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-radius-md border border-border bg-bg px-3 py-2 text-sm text-text-primary"
        >
          <option value="">All statuses</option>
          {EMPLOYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="mb-4 text-sm text-error-text">{error}</p>}

      <div className="overflow-hidden rounded-radius-lg border border-border bg-bg-elevated shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-bg-alt text-left text-text-secondary">
            <tr>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Department</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-text-secondary">
                  Loading...
                </td>
              </tr>
            ) : employees.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-text-secondary">
                  No employees found.
                </td>
              </tr>
            ) : (
              employees.map((emp) => (
                <tr key={emp.id} className="border-b border-divider last:border-0 hover:bg-bg-alt">
                  <td className="px-4 py-3">
                    <Link to={`/employees/${emp.id}`} className="font-medium text-brand-red hover:underline">
                      <code>{emp.employee_code}</code>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-text-primary">{emp.name}</td>
                  <td className="px-4 py-3 text-text-primary">{emp.department ?? '—'}</td>
                  <td className="px-4 py-3 text-text-primary">{emp.locations?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-radius-pill border px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[emp.employment_status]}`}
                    >
                      {emp.employment_status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
