export type EmploymentStatus = 'active' | 'notice' | 'exited'

export const EMPLOYMENT_STATUSES: EmploymentStatus[] = ['active', 'notice', 'exited']

export interface Employee {
  id: string
  employee_code: string
  name: string
  work_email: string
  department: string | null
  designation: string | null
  join_date: string | null
  employment_status: EmploymentStatus
  location_id: string | null
  created_at: string
  updated_at: string
}

export interface EmployeeWithLocation extends Employee {
  locations: { name: string } | null
}
