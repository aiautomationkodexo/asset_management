import type { AssetCategory, AssetCondition, AssetStatus, Location } from '@/types/asset'
import { ASSET_CONDITIONS, ASSET_STATUSES } from '@/types/asset'

export const IMPORT_FIELDS = [
  'category',
  'make',
  'model',
  'serial_no',
  'condition',
  'location',
  'status',
  'notes',
] as const
export type ImportField = (typeof IMPORT_FIELDS)[number]

export const IMPORT_FIELD_LABELS: Record<ImportField, string> = {
  category: 'Category',
  make: 'Make',
  model: 'Model',
  serial_no: 'Serial number',
  condition: 'Condition',
  location: 'Location',
  status: 'Status',
  notes: 'Notes',
}

// FR-1.1: required on create.
const REQUIRED_IMPORT_FIELDS: ImportField[] = ['category', 'make', 'model', 'condition', 'location']

export type ColumnMapping = Partial<Record<ImportField, string>>

export interface ResolvedImportRow {
  category_id: string
  make: string
  model: string
  serial_no: string | null
  condition: AssetCondition
  location_id: string | null
  status: AssetStatus
  notes: string | null
}

export interface ImportRowResult {
  rowNumber: number
  mapped: Record<ImportField, string>
  status: 'ok' | 'error' | 'duplicate'
  reasons: string[]
  resolved: ResolvedImportRow | null
}

export function autoMapColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {}
  const normalized = headers.map((h) => [h, h.trim().toLowerCase().replace(/[\s-]+/g, '_')] as const)
  for (const field of IMPORT_FIELDS) {
    const match = normalized.find(([, norm]) => norm === field)
    if (match) mapping[field] = match[0]
  }
  return mapping
}

export function validateRows(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
  categories: AssetCategory[],
  locations: Location[],
  existingSerials: Set<string>
): ImportRowResult[] {
  const categoryByName = new Map(categories.map((c) => [c.name.trim().toLowerCase(), c]))
  const locationByName = new Map(locations.map((l) => [l.name.trim().toLowerCase(), l]))
  const seenSerials = new Set<string>()

  return rows.map((raw, idx) => {
    const get = (field: ImportField) => {
      const header = mapping[field]
      return header ? (raw[header] ?? '').trim() : ''
    }
    const mapped: Record<ImportField, string> = {
      category: get('category'),
      make: get('make'),
      model: get('model'),
      serial_no: get('serial_no'),
      condition: get('condition'),
      location: get('location'),
      status: get('status'),
      notes: get('notes'),
    }

    const reasons: string[] = []

    for (const field of REQUIRED_IMPORT_FIELDS) {
      if (!mapped[field]) reasons.push(`${IMPORT_FIELD_LABELS[field]} is required`)
    }

    const category = mapped.category ? categoryByName.get(mapped.category.toLowerCase()) : undefined
    if (mapped.category && !category) reasons.push(`Unknown category "${mapped.category}"`)

    const location = mapped.location ? locationByName.get(mapped.location.toLowerCase()) : undefined
    if (mapped.location && !location) reasons.push(`Unknown location "${mapped.location}"`)

    const conditionInput = mapped.condition.toLowerCase()
    if (mapped.condition && !ASSET_CONDITIONS.includes(conditionInput as AssetCondition)) {
      reasons.push(`Invalid condition "${mapped.condition}" (expected ${ASSET_CONDITIONS.join(', ')})`)
    }

    const statusInput = (mapped.status || 'in_stock').toLowerCase()
    if (mapped.status && !ASSET_STATUSES.includes(statusInput as AssetStatus)) {
      reasons.push(`Invalid status "${mapped.status}" (expected ${ASSET_STATUSES.join(', ')})`)
    }

    let isDuplicateSerial = false
    if (mapped.serial_no) {
      const key = mapped.serial_no.toLowerCase()
      if (existingSerials.has(key) || seenSerials.has(key)) {
        isDuplicateSerial = true
        reasons.push(`Duplicate serial number "${mapped.serial_no}"`)
      }
      seenSerials.add(key)
    }

    let status: ImportRowResult['status'] = 'ok'
    if (reasons.length > 0) {
      status = isDuplicateSerial && reasons.length === 1 ? 'duplicate' : 'error'
    }

    const resolved: ResolvedImportRow | null =
      status === 'ok' && category
        ? {
            category_id: category.id,
            make: mapped.make,
            model: mapped.model,
            serial_no: mapped.serial_no || null,
            condition: conditionInput as AssetCondition,
            location_id: location?.id ?? null,
            status: statusInput as AssetStatus,
            notes: mapped.notes || null,
          }
        : null

    return { rowNumber: idx + 1, mapped, status, reasons, resolved }
  })
}
