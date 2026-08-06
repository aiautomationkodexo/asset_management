export interface Purchase {
  id: string
  vendor_name: string
  invoice_no: string | null
  invoice_date: string
  currency: string
  amount_original: number
  fx_rate: number
  amount_base: number
  warranty_until: string | null
  attachment_url: string | null
  created_at: string
}

export interface PurchaseAsset {
  id: string
  purchase_id: string
  asset_id: string
  asset_tag: string
  unit_cost: number
  created_at: string
}
