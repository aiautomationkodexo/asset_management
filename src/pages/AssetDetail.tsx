import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { Pencil, Trash2, Download, Printer } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { AssetWithRelations } from '@/types/asset'
import { ASSET_STATUS_LABELS, ASSET_STATUS_TONE } from '@/lib/assetStatusStyle'
import { generateLabelsPdf } from '@/lib/labelPdf'
import { useSimpleAuth } from '@/contexts/SimpleAuthContext'
import { CustodyPanel } from '@/components/CustodyPanel'
import { DisposalPanel } from '@/components/DisposalPanel'
import { MaintenancePanel } from '@/components/MaintenancePanel'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { buttonClass } from '@/components/ui/buttonStyles'

export function AssetDetail() {
  const { isAdmin } = useSimpleAuth()
  const { id } = useParams()
  const navigate = useNavigate()
  const [asset, setAsset] = useState<AssetWithRelations | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [isPrintingLabel, setIsPrintingLabel] = useState(false)

  const load = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('assets')
      .select('*, asset_categories(name), locations(name)')
      .eq('id', id)
      .single()

    if (error) {
      setError(error.message)
    } else {
      setAsset(data as unknown as AssetWithRelations)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    if (!id) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    if (!asset?.public_slug) return
    const publicUrl = `${window.location.origin}/a/${asset.public_slug}`
    QRCode.toDataURL(publicUrl, {
      errorCorrectionLevel: 'M',
      margin: 4,
      width: 512,
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null))
  }, [asset?.public_slug])

  function handleDownloadQr() {
    if (!qrDataUrl || !asset) return
    const link = document.createElement('a')
    link.href = qrDataUrl
    link.download = `${asset.asset_tag}-qr.png`
    link.click()
  }

  async function handlePrintLabel() {
    if (!asset) return
    setIsPrintingLabel(true)
    try {
      const doc = await generateLabelsPdf(
        [{ asset_tag: asset.asset_tag, public_slug: asset.public_slug }],
        window.location.origin
      )
      doc.save(`${asset.asset_tag}-label.pdf`)
    } finally {
      setIsPrintingLabel(false)
    }
  }

  async function handleDelete() {
    if (!id) return
    if (!window.confirm('Remove this asset? Custody history is preserved.')) return

    const { error } = await supabase
      .from('assets')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      setError(error.message)
      return
    }
    navigate('/assets')
  }

  if (isLoading) {
    return <div className="p-8 text-text-secondary">Loading...</div>
  }

  if (error || !asset) {
    return <div className="p-8 text-error-text">{error ?? 'Asset not found.'}</div>
  }

  const fields: Array<[string, string]> = [
    ['Category', asset.asset_categories?.name ?? '—'],
    ['Make', asset.make ?? '—'],
    ['Model', asset.model ?? '—'],
    ['Serial number', asset.serial_no ?? '—'],
    ['Condition', asset.condition],
    ['Location', asset.locations?.name ?? '—'],
    ['Notes', asset.notes ?? '—'],
  ]

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <h1 className="text-h3">
              <code>{asset.asset_tag}</code>
            </h1>
            <Badge tone={ASSET_STATUS_TONE[asset.status]}>{ASSET_STATUS_LABELS[asset.status]}</Badge>
          </div>
          <Link to={`/a/${asset.public_slug}`} className="text-sm text-brand-red hover:underline">
            Public scan link ↗
          </Link>
        </div>
        {isAdmin && (
          <div className="flex gap-3">
            <Link to={`/assets/${asset.id}/edit`} className={buttonClass('tertiary')}>
              <Pencil className="h-4 w-4" strokeWidth={1.75} />
              Edit
            </Link>
            <button onClick={handleDelete} className={buttonClass('danger')}>
              <Trash2 className="h-4 w-4" strokeWidth={1.75} />
              Delete
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6 lg:order-1">
          <CustodyPanel assetId={asset.id} assetStatus={asset.status} isAdmin={isAdmin} onChanged={load} />

          <MaintenancePanel
            assetId={asset.id}
            purchaseCostBase={asset.purchase_cost_base}
            isAdmin={isAdmin}
            onChanged={load}
          />

          {isAdmin && <DisposalPanel asset={asset} onChanged={load} />}

          <Card>
            <dl className="divide-y divide-divider">
              {fields.map(([label, value]) => (
                <div key={label} className="flex justify-between px-4 py-3 text-sm">
                  <dt className="text-text-secondary">{label}</dt>
                  <dd className="font-medium capitalize text-text-primary">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>

        <div className="lg:order-2">
          <Card className="card-in flex flex-col items-center gap-3 p-6">
            <div className="rounded-radius-md bg-white p-3">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt={`QR code for ${asset.asset_tag}`} className="h-36 w-36" />
              ) : (
                <div className="h-36 w-36 animate-pulse bg-bg-alt" />
              )}
            </div>
            <div className="text-center text-sm">
              <p className="text-text-secondary">
                Asset tag: <span className="font-medium text-text-primary">{asset.asset_tag}</span>
              </p>
              <p className="text-text-secondary">
                Public slug: <span className="font-medium text-text-primary">{asset.public_slug}</span>
              </p>
            </div>
            <div className="flex w-full flex-col gap-2">
              <button
                onClick={handleDownloadQr}
                disabled={!qrDataUrl}
                className={buttonClass('tertiary', 'w-full')}
              >
                <Download className="h-4 w-4" strokeWidth={1.75} />
                Download QR Code
              </button>
              <button onClick={handlePrintLabel} disabled={isPrintingLabel} className={buttonClass('tertiary', 'w-full')}>
                <Printer className="h-4 w-4" strokeWidth={1.75} />
                {isPrintingLabel ? 'Generating...' : 'Print label'}
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
