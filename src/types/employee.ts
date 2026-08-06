export type EmploymentStatus = 'active' | 'notice' | 'exited'

export const EMPLOYMENT_STATUSES: EmploymentStatus[] = ['active', 'notice', 'exited']

export interface Employee {
  id: string
  employee_code: string
  full_name: string
  work_email: string
  department: string | null
  designation: string | null
  join_date: string | null
  employment_status: EmploymentStatus
  location: string | null
  created_at: string
}
