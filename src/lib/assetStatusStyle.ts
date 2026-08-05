import type { AssetStatus } from '@/types/asset'

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  in_stock: 'In stock',
  assigned: 'Assigned',
  in_repair: 'In repair',
  lost: 'Lost',
  disposed: 'Disposed',
}

// in_stock/in_repair/lost map directly onto the success/warning/error triad
// the token file names for status badges. assigned -> info and disposed ->
// neutral are this app's own interpretation (no dedicated token fits either
// exactly) — see chat summary for the open-decision flag on this mapping.
export const ASSET_STATUS_STYLE: Record<AssetStatus, string> = {
  in_stock: 'border-success-border bg-success-bg text-success-text',
  assigned: 'border-info-border bg-info-bg text-info-text',
  in_repair: 'border-warning-border bg-warning-bg text-warning-text',
  lost: 'border-error-border bg-error-bg text-error-text',
  disposed: 'border-border bg-n-100 text-text-tertiary',
}
