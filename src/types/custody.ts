import type { AssetCondition } from './asset'

export interface Assignment {
  id: string
  asset_id: string
  asset_tag: string
  employee_code: string
  employee_name: string
  condition_out: AssetCondition
  issued_by: string
  signature_data_url: string | null
  assigned_at: string
  returned_at: string | null
  condition_in: AssetCondition | null
  damage_notes: string | null
  received_by: string | null
  created_at: string
}

export type ClearanceStatus = 'open' | 'complete'
export type ClearanceItemStatus = 'pending' | 'returned' | 'lost'

export interface OffboardingClearance {
  id: string
  employee_id: string
  status: ClearanceStatus
  created_at: string
  completed_at: string | null
}

export interface OffboardingClearanceItem {
  id: string
  clearance_id: string
  assignment_id: string
  status: ClearanceItemStatus
  notes: string | null
  updated_at: string
}

export interface OffboardingClearanceItemWithAsset extends OffboardingClearanceItem {
  assignments: { asset_id: string; assets: { asset_tag: string } | null } | null
}
