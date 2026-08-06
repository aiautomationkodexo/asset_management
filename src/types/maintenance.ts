export type MaintenanceLogType = 'repair' | 'service' | 'upgrade' | 'inspection'

export const MAINTENANCE_LOG_TYPES: MaintenanceLogType[] = ['repair', 'service', 'upgrade', 'inspection']

export interface MaintenanceLog {
  id: string
  asset_id: string
  log_date: string
  type: MaintenanceLogType
  vendor_name: string | null
  cost: number
  downtime_days: number | null
  description: string | null
  resolved_at: string | null
  created_at: string
}
