import type { EmploymentStatus, Employee } from '@/types/employee'
import { EMPLOYMENT_STATUSES } from '@/types/employee'
import type { Location } from '@/types/asset'

export const EMPLOYEE_IMPORT_FIELDS = [
  'employee_code',
  'name',
  'work_email',
  'department',
  'designation',
  'join_date',
  'employment_status',
  'location',
] as const
export type EmployeeImportField = (typeof EMPLOYEE_IMPORT_FIELDS)[number]

export const EMPLOYEE_IMPORT_FIELD_LABELS: Record<EmployeeImportField, string> = {
  employee_code: 'Employee code',
  name: 'Name',
  work_email: 'Work email',
  department: 'Department',
  designation: 'Designation',
  join_date: 'Join date',
  employment_status: 'Employment status',
  location: 'Location',
}

const REQUIRED_FIELDS: EmployeeImportField[] = ['employee_code', 'name', 'work_email']

export type EmployeeColumnMapping = Partial<Record<EmployeeImportField, string>>

export interface ResolvedEmployeeRow {
  employee_code: string
  name: string
  work_email: string
  department: string | null
  designation: string | null
  join_date: string | null
  employment_status: EmploymentStatus
  location_id: string | null
}

export interface EmployeeImportRow {
  rowNumber: number
  mapped: Record<EmployeeImportField, string>
  status: 'insert' | 'update' | 'error'
  reasons: string[]
  resolved: ResolvedEmployeeRow | null
  existingId: string | null
}

export function autoMapEmployeeColumns(headers: string[]): EmployeeColumnMapping {
  const mapping: EmployeeColumnMapping = {}
  const normalized = headers.map((h) => [h, h.trim().toLowerCase().replace(/[\s-]+/g, '_')] as const)
  for (const field of EMPLOYEE_IMPORT_FIELDS) {
    const match = normalized.find(([, norm]) => norm === field)
    if (match) mapping[field] = match[0]
  }
  return mapping
}

export function validateEmployeeRows(
  rows: Record<string, string>[],
  mapping: EmployeeColumnMapping,
  existing: Employee[],
  locations: Location[]
): EmployeeImportRow[] {
  const existingByCode = new Map(existing.map((e) => [e.employee_code.trim().toLowerCase(), e]))
  const locationByName = new Map(locations.map((l) => [l.name.trim().toLowerCase(), l]))

  return rows.map((raw, idx) => {
    const get = (field: EmployeeImportField) => {
      const header = mapping[field]
      return header ? (raw[header] ?? '').trim() : ''
    }
    const mapped: Record<EmployeeImportField, string> = {
      employee_code: get('employee_code'),
      name: get('name'),
      work_email: get('work_email'),
      department: get('department'),
      designation: get('designation'),
      join_date: get('join_date'),
      employment_status: get('employment_status'),
      location: get('location'),
    }

    const reasons: string[] = []
    for (const field of REQUIRED_FIELDS) {
      if (!mapped[field]) reasons.push(`${EMPLOYEE_IMPORT_FIELD_LABELS[field]} is required`)
    }

    const statusInput = (mapped.employment_status || 'active').toLowerCase()
    if (mapped.employment_status && !EMPLOYMENT_STATUSES.includes(statusInput as EmploymentStatus)) {
      reasons.push(`Invalid employment status "${mapped.employment_status}" (expected ${EMPLOYMENT_STATUSES.join(', ')})`)
    }

    const location = mapped.location ? locationByName.get(mapped.location.toLowerCase()) : undefined
    if (mapped.location && !location) reasons.push(`Unknown location "${mapped.location}"`)

    const existingMatch = mapped.employee_code
      ? existingByCode.get(mapped.employee_code.toLowerCase())
      : undefined

    const status: EmployeeImportRow['status'] = reasons.length > 0 ? 'error' : existingMatch ? 'update' : 'insert'

    const resolved: ResolvedEmployeeRow | null =
      status !== 'error'
        ? {
            employee_code: mapped.employee_code,
            name: mapped.name,
            work_email: mapped.work_email,
            department: mapped.department || null,
            designation: mapped.designation || null,
            join_date: mapped.join_date || null,
            employment_status: statusInput as EmploymentStatus,
            location_id: location?.id ?? null,
          }
        : null

    return { rowNumber: idx + 1, mapped, status, reasons, resolved, existingId: existingMatch?.id ?? null }
  })
}
