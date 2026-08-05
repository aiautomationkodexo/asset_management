export interface AuditSession {
  id: string
  location_id: string | null
  started_at: string
  closed_at: string | null
  created_by: string | null
}

export interface AuditScan {
  id: string
  session_id: string
  scanned_slug: string
  asset_id: string | null
  scanned_at: string
}
