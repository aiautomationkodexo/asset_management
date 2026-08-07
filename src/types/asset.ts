export type AssetCondition = 'new' | 'good' | 'fair' | 'poor'
export type AssetStatus = 'in_stock' | 'assigned' | 'in_repair' | 'lost' | 'disposed'
export type LocationType = 'desk' | 'room' | 'store' | 'offsite'
export type AssetDisposalMethod = 'sold' | 'scrapped' | 'donated' | 'other'

export interface AssetCategory {
  id: string
  name: string
  tag_prefix: string
  is_depreciable: boolean
  is_physical: boolean
  default_useful_life_months: number | null
  default_tax_depr_rate: number | null
}

export interface Location {
  id: string
  name: string
  type: LocationType
  parent_id: string | null
}

export interface Asset {
  id: string
  public_slug: string
  asset_tag: string
  category_id: string
  make: string | null
  model: string | null
  serial_no: string | null
  condition: AssetCondition
  status: AssetStatus
  location_id: string | null
  purchase_id: string | null
  purchase_cost_base: number | null
  in_service_date: string | null
  useful_life_months: number | null
  salvage_value: number | null
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  disposal_date: string | null
  disposal_method: AssetDisposalMethod | null
  disposal_proceeds: number | null
  disposal_notes: string | null
  disposal_gain_loss: number | null
}

export interface AssetWithRelations extends Asset {
  asset_categories: { name: string } | null
  locations: { name: string } | null
}

export const ASSET_CONDITIONS: AssetCondition[] = ['new', 'good', 'fair', 'poor']
export const ASSET_STATUSES: AssetStatus[] = ['in_stock', 'assigned', 'in_repair', 'lost', 'disposed']
export const ASSET_DISPOSAL_METHODS: AssetDisposalMethod[] = ['sold', 'scrapped', 'donated', 'other']

export interface ImportBatch {
  id: string
  filename: string
  total_rows: number
  inserted_count: number
  error_count: number
  duplicate_count: number
  status: 'committed' | 'failed'
  error_message: string | null
  created_at: string
}
