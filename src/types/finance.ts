export interface Purchase {
  id: string
  vendor: string
  invoice_number: string | null
  purchase_date: string
  currency: string
  amount: number
  fx_rate: number
  warranty_until: string | null
  invoice_file_data_url: string | null
  created_at: string
}

export type DepreciationMethod = 'book' | 'tax'

export interface DepreciationSnapshot {
  id: string
  asset_id: string
  period: string
  method: DepreciationMethod
  opening_value: number
  charge: number
  closing_value: number
  created_at: string
}

export interface Disposal {
  id: string
  asset_id: string
  disposal_date: string
  method: string
  proceeds: number
  book_value_at_disposal: number
  gain_loss: number
  created_at: string
}
