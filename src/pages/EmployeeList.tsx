import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Plus, Upload, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Employee } from '@/types/employee'
import { EMPLOYMENT_STATUSES } from '@/types/employee'
import { useSimpleAuth } from '@/contexts/SimpleAuthContext'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { buttonClass } from '@/components/ui/buttonStyles'

const STATUS_TONE: Record<string, 'success' | 'warning' | 'neutral'> = {
  active: 'success',
  notice: 'warning',
  exited: 'neutral',
}

export function EmployeeList() {
  const { isAdmin } = useSimpleAuth()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsLoading(true)
    let query = supabase
      .from('employees')
      .select('*')
      .order('full_name')

    if (statusFilter) query = query.eq('employment_status', statusFilter)
    if (search.trim()) {
      const term = search.trim()
      query = query.or(`full_name.ilike.%${term}%,employee_code.ilike.%${term}%,work_email.ilike.%${term}%`)
    }

    query.then(({ data, error }) => {
      if (error) setError(error.message)
      else setEmployees((data ?? []) as Employee[])
      setIsLoading(false)
    })
  }, [search, statusFilter])

  return (
    <div className="p-8">
      <PageHeader
        kicker="People"
        title="Employees"
        actions={
          isAdmin && (
            <>
              <Link to="/employees/import" className={buttonClass('tertiary')}>
                <Upload className="h-4 w-4" strokeWidth={1.75} />
                CSV import
              </Link>
              <Link to="/employees/new" className={buttonClass('primary')}>
                <Plus className="h-4 w-4" strokeWidth={1.75} />
                Add employee
              </Link>
            </>
          )
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search code, name, email..."
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto">
          <option value="">All statuses</option>
          {EMPLOYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>

      {error && <p className="mb-4 text-sm text-error-text">{error}</p>}

      <Card className="overflow-hidden">
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
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-divider last:border-0">
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-16" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-28" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-20" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-5 w-14 rounded-radius-pill" />
                  </td>
                </tr>
              ))
            ) : employees.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <EmptyState
                    icon={Users}
                    title="No employees found"
                    description={search || statusFilter ? 'Try clearing a filter.' : 'Add the first employee.'}
                    action={
                      isAdmin && (
                        <Link to="/employees/new" className={buttonClass('primary')}>
                          <Plus className="h-4 w-4" strokeWidth={1.75} />
                          Add employee
                        </Link>
                      )
                    }
                  />
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
                  <td className="px-4 py-3 text-text-primary">{emp.full_name}</td>
                  <td className="px-4 py-3 text-text-primary">{emp.department ?? '—'}</td>
                  <td className="px-4 py-3 text-text-primary">{emp.location ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[emp.employment_status] ?? 'neutral'}>{emp.employment_status}</Badge>
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
