import type { AssetStatus } from '@/types/asset'

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  in_stock: 'In stock',
  assigned: 'Assigned',
  in_repair: 'In repair',
  lost: 'Lost',
  disposed: 'Disposed',
}

// Same tone everywhere a status appears: in_stock -> info, assigned ->
// success, in_repair -> warning, lost -> error, disposed -> neutral.
export const ASSET_STATUS_TONE: Record<AssetStatus, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  in_stock: 'info',
  assigned: 'success',
  in_repair: 'warning',
  lost: 'error',
  disposed: 'neutral',
}
