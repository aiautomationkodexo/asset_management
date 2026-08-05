import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { AssetStatus } from '@/types/asset'
import { ASSET_STATUS_LABELS } from '@/lib/assetStatusStyle'

interface PublicAsset {
  asset_tag: string
  category_name: string | null
  make: string | null
  model: string | null
  status: AssetStatus
}

export function PublicScan() {
  const { slug } = useParams()
  const [asset, setAsset] = useState<PublicAsset | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) return
    supabase
      .rpc('get_public_asset', { slug })
      .then(({ data, error }) => {
        if (error || !data || data.length === 0) {
          setNotFound(true)
        } else {
          setAsset(data[0])
        }
        setIsLoading(false)
      })
  }, [slug])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg p-4">
      <div className="card-in w-full max-w-sm rounded-radius-lg border border-border bg-bg-elevated p-8 text-center shadow-md">
        {isLoading ? (
          <p className="text-text-secondary">Loading...</p>
        ) : notFound || !asset ? (
          <>
            <h1 className="mb-2 text-2xl">Not found</h1>
            <p className="text-text-secondary">This asset could not be found.</p>
          </>
        ) : (
          <>
            <h1 className="mb-4 text-2xl">
              <code>{asset.asset_tag}</code>
            </h1>
            <dl className="mb-6 space-y-2 text-left text-sm">
              <div className="flex justify-between">
                <dt className="text-text-secondary">Category</dt>
                <dd className="font-medium text-text-primary">{asset.category_name ?? '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-secondary">Make</dt>
                <dd className="font-medium text-text-primary">{asset.make ?? '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-secondary">Model</dt>
                <dd className="font-medium text-text-primary">{asset.model ?? '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-secondary">Status</dt>
                <dd className="font-medium text-text-primary">{ASSET_STATUS_LABELS[asset.status]}</dd>
              </div>
            </dl>
            <p className="text-xs text-text-tertiary">Property of Kodexo Labs</p>
          </>
        )}
      </div>
    </div>
  )
}
