import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { supabase } from '@/lib/supabase'
import type { AssetWithRelations } from '@/types/asset'
import { ASSET_STATUS_LABELS, ASSET_STATUS_STYLE } from '@/lib/assetStatusStyle'
import { generateLabelsPdf } from '@/lib/labelPdf'
import { useSimpleAuth } from '@/contexts/SimpleAuthContext'
import { CustodyPanel } from '@/components/CustodyPanel'
import { DisposalPanel } from '@/components/DisposalPanel'
import { MaintenancePanel } from '@/components/MaintenancePanel'

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
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl">
            <code>{asset.asset_tag}</code>
          </h1>
          <Link to={`/a/${asset.public_slug}`} className="text-sm text-brand-red hover:underline">
            Public scan link ↗
          </Link>
        </div>
        {isAdmin && (
          <div className="flex gap-3">
            <Link
              to={`/assets/${asset.id}/edit`}
              className="rounded-radius-md border border-border bg-bg-alt px-4 py-2 text-sm font-medium text-text-primary hover:bg-border"
            >
              Edit
            </Link>
            <button
              onClick={handleDelete}
              className="rounded-radius-md bg-brand-red-deep px-4 py-2 text-sm font-medium text-text-on-brand hover:bg-brand-red"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      <div className="card-in mb-6 flex max-w-lg flex-col items-center gap-3 rounded-radius-lg border border-border bg-bg-elevated p-6 shadow-sm">
        <div className="rounded-radius-md bg-white p-3">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt={`QR code for ${asset.asset_tag}`} className="h-40 w-40" />
          ) : (
            <div className="h-40 w-40 animate-pulse bg-bg-alt" />
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
        <div className="flex gap-3">
          <button
            onClick={handleDownloadQr}
            disabled={!qrDataUrl}
            className="rounded-radius-md border border-border bg-bg-alt px-4 py-2 text-sm font-medium text-text-primary hover:bg-border disabled:opacity-50"
          >
            Download QR Code
          </button>
          <button
            onClick={handlePrintLabel}
            disabled={isPrintingLabel}
            className="rounded-radius-md border border-border bg-bg-alt px-4 py-2 text-sm font-medium text-text-primary hover:bg-border disabled:opacity-50"
          >
            {isPrintingLabel ? 'Generating...' : 'Print label'}
          </button>
        </div>
      </div>

      <CustodyPanel assetId={asset.id} assetStatus={asset.status} isAdmin={isAdmin} onChanged={load} />

      <MaintenancePanel
        assetId={asset.id}
        purchaseCostBase={asset.purchase_cost_base}
        isAdmin={isAdmin}
        onChanged={load}
      />

      {isAdmin && <DisposalPanel asset={asset} onChanged={load} />}

      <dl className="card-in max-w-lg divide-y divide-divider rounded-radius-lg border border-border bg-bg-elevated shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 text-sm">
          <dt className="text-text-secondary">Status</dt>
          <dd>
            <span
              className={`rounded-radius-pill border px-2 py-0.5 text-xs font-medium ${ASSET_STATUS_STYLE[asset.status]}`}
            >
              {ASSET_STATUS_LABELS[asset.status]}
            </span>
          </dd>
        </div>
        {fields.map(([label, value]) => (
          <div key={label} className="flex justify-between px-4 py-3 text-sm">
            <dt className="text-text-secondary">{label}</dt>
            <dd className="font-medium capitalize text-text-primary">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
