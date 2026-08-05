import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ShieldCheck, SearchX } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { AssetStatus } from '@/types/asset'
import { ASSET_STATUS_LABELS, ASSET_STATUS_TONE } from '@/lib/assetStatusStyle'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-alt p-4">
      <Card className="card-in w-full max-w-sm p-8 text-center">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-radius-md bg-brand-red-tint text-brand-red-deep">
          <ShieldCheck className="h-5 w-5" strokeWidth={1.75} />
        </div>

        {isLoading ? (
          <p className="text-sm text-text-secondary">Loading...</p>
        ) : notFound || !asset ? (
          <>
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-radius-md bg-error-bg text-error-text">
              <SearchX className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <h1 className="text-h5 mb-2">Not found</h1>
            <p className="text-sm text-text-secondary">This asset could not be found.</p>
          </>
        ) : (
          <>
            <h1 className="text-h4 mb-1">
              <code>{asset.asset_tag}</code>
            </h1>
            <div className="mb-4 flex justify-center">
              <Badge tone={ASSET_STATUS_TONE[asset.status]}>{ASSET_STATUS_LABELS[asset.status]}</Badge>
            </div>
            <dl className="mb-6 space-y-2 text-left text-sm">
              <div className="flex justify-between border-b border-divider pb-2">
                <dt className="text-text-secondary">Category</dt>
                <dd className="font-medium text-text-primary">{asset.category_name ?? '—'}</dd>
              </div>
              <div className="flex justify-between border-b border-divider pb-2">
                <dt className="text-text-secondary">Make</dt>
                <dd className="font-medium text-text-primary">{asset.make ?? '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-secondary">Model</dt>
                <dd className="font-medium text-text-primary">{asset.model ?? '—'}</dd>
              </div>
            </dl>
            <p className="text-xs text-text-tertiary">Property of Kodexo Labs</p>
          </>
        )}
      </Card>
    </div>
  )
}
