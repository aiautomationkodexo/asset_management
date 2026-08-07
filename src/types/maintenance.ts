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
  // True only for the placeholder row Return auto-creates when the
  // resulting status is in_repair — lets the UI flag it as needing real
  // details, and lets the Slack trigger skip alerting on the empty insert.
  auto_created: boolean
}
