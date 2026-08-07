import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { Pencil, Trash2, Download, Printer } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { AssetDisposalMethod, AssetWithRelations } from '@/types/asset'
import { ASSET_DISPOSAL_METHODS } from '@/types/asset'
import { ASSET_STATUS_LABELS, ASSET_STATUS_TONE } from '@/lib/assetStatusStyle'
import { generateLabelsPdf, printPdf } from '@/lib/labelPdf'
import { bookValue } from '@/lib/depreciation'
import { useSimpleAuth } from '@/contexts/SimpleAuthContext'
import { CustodyPanel } from '@/components/CustodyPanel'
import { MaintenancePanel } from '@/components/MaintenancePanel'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Label } from '@/components/ui/Label'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { buttonClass } from '@/components/ui/buttonStyles'
import { sentenceCase, todayDateInputValue } from '@/lib/utils'

export function AssetDetail() {
  const { isAdmin } = useSimpleAuth()
  const { id } = useParams()
  const [asset, setAsset] = useState<AssetWithRelations | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [isPrintingLabel, setIsPrintingLabel] = useState(false)
  const [isDisposeOpen, setIsDisposeOpen] = useState(false)
  const [disposalDate, setDisposalDate] = useState(todayDateInputValue())
  const [disposalMethod, setDisposalMethod] = useState<AssetDisposalMethod | ''>('')
  const [disposalProceeds, setDisposalProceeds] = useState('')
  const [disposalNotes, setDisposalNotes] = useState('')
  const [isDisposing, setIsDisposing] = useState(false)
  const [disposeError, setDisposeError] = useState<string | null>(null)

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
      printPdf(doc)
    } finally {
      setIsPrintingLabel(false)
    }
  }

  function bookValueAsOf(dateValue: string): number | null {
    if (!asset || asset.purchase_cost_base == null || !asset.in_service_date) return null
    const [year, month, day] = dateValue.split('-').map(Number)
    return bookValue(
      asset.purchase_cost_base,
      asset.salvage_value ?? 0,
      asset.useful_life_months ?? 0,
      asset.in_service_date,
      new Date(year, month - 1, day)
    )
  }

  const disposalBookValue = bookValueAsOf(disposalDate)
  const disposalProceedsNum = disposalProceeds.trim() === '' ? null : Number(disposalProceeds)
  const disposalGainLoss =
    disposalProceedsNum != null && disposalBookValue != null ? disposalProceedsNum - disposalBookValue : null

  function closeDisposeModal() {
    setIsDisposeOpen(false)
    setDisposalDate(todayDateInputValue())
    setDisposalMethod('')
    setDisposalProceeds('')
    setDisposalNotes('')
    setDisposeError(null)
  }

  async function handleDispose() {
    if (!id || !asset || !disposalMethod) return
    setIsDisposing(true)
    setDisposeError(null)

    const { error } = await supabase
      .from('assets')
      .update({
        status: 'disposed',
        disposal_date: disposalDate,
        disposal_method: disposalMethod,
        disposal_proceeds: disposalProceedsNum,
        disposal_notes: disposalNotes || null,
        disposal_gain_loss: disposalGainLoss,
      })
      .eq('id', id)

    setIsDisposing(false)
    if (error) {
      setDisposeError(error.message)
      return
    }
    await supabase.rpc('notify_asset_disposed', {
      p_asset_tag: asset.asset_tag,
      p_method: disposalMethod,
      p_date: disposalDate,
    })
    closeDisposeModal()
    load()
  }

  if (isLoading) {
    return <div className="p-4 sm:p-8 text-text-secondary">Loading...</div>
  }

  if (error || !asset) {
    return <div className="p-4 sm:p-8 text-error-text">{error ?? 'Asset not found.'}</div>
  }

  const fields: Array<[string, string]> = [
    ['Category', asset.asset_categories?.name ?? '—'],
    ['Make', asset.make ?? '—'],
    ['Model', asset.model ?? '—'],
    ['Serial number', asset.serial_no ?? '—'],
    ['Condition', asset.condition],
    ['Location', asset.locations?.name ?? '—'],
    ['Notes', asset.notes ?? '—'],
    ...(asset.status === 'disposed'
      ? ([
          ['Disposed on', asset.disposal_date ?? '—'],
          ['Disposal method', asset.disposal_method ? sentenceCase(asset.disposal_method) : '—'],
          ['Proceeds', asset.disposal_proceeds != null ? asset.disposal_proceeds.toFixed(2) : '—'],
          [
            'Gain / loss',
            asset.disposal_gain_loss != null
              ? `${asset.disposal_gain_loss >= 0 ? 'Gain' : 'Loss'} of ${Math.abs(asset.disposal_gain_loss).toFixed(2)}`
              : '—',
          ],
          ['Disposal notes', asset.disposal_notes ?? '—'],
        ] as Array<[string, string]>)
      : []),
  ]

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8 flex flex-col flex-wrap items-start justify-between gap-4 sm:flex-row">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-3">
            <h1 className="text-h3 break-all">
              <code>{asset.asset_tag}</code>
            </h1>
            <Badge tone={ASSET_STATUS_TONE[asset.status]}>{ASSET_STATUS_LABELS[asset.status]}</Badge>
          </div>
          <Link to={`/a/${asset.public_slug}`} className="text-sm text-brand-red hover:underline">
            Public scan link ↗
          </Link>
        </div>
        {isAdmin && (
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link to={`/assets/${asset.id}/edit`} className={buttonClass('tertiary')}>
              <Pencil className="h-4 w-4" strokeWidth={1.75} />
              Edit
            </Link>
            {asset.status !== 'disposed' && (
              <button onClick={() => setIsDisposeOpen(true)} className={buttonClass('danger')}>
                <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                Dispose asset
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6 lg:order-1">
          <CustodyPanel
            assetId={asset.id}
            assetTag={asset.asset_tag}
            assetStatus={asset.status}
            isAdmin={isAdmin}
            onChanged={load}
          />

          <MaintenancePanel
            assetId={asset.id}
            purchaseCostBase={asset.purchase_cost_base}
            isAdmin={isAdmin}
            onChanged={load}
          />

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

      <ConfirmModal
        open={isDisposeOpen}
        title="Dispose Asset"
        description={`Dispose ${asset.asset_tag}? This cannot be undone.`}
        confirmLabel="Dispose asset"
        onConfirm={handleDispose}
        onCancel={closeDisposeModal}
        isSaving={isDisposing}
        confirmDisabled={!disposalMethod}
      >
        <div className="space-y-3">
          <div>
            <Label>Disposal date</Label>
            <Input type="date" value={disposalDate} onChange={(e) => setDisposalDate(e.target.value)} />
          </div>
          <div>
            <Label>Method</Label>
            <Select
              value={disposalMethod}
              onChange={(e) => setDisposalMethod(e.target.value as AssetDisposalMethod)}
            >
              <option value="" disabled>
                Select method
              </option>
              {ASSET_DISPOSAL_METHODS.map((method) => (
                <option key={method} value={method}>
                  {sentenceCase(method)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Proceeds (optional)</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="Leave blank if none"
              value={disposalProceeds}
              onChange={(e) => setDisposalProceeds(e.target.value)}
            />
            {disposalProceedsNum != null && (
              <p className="mt-1 text-body-xs text-text-secondary">
                {disposalBookValue != null ? (
                  <>
                    Book value at this date: {disposalBookValue.toFixed(2)} —{' '}
                    <span className={disposalGainLoss! >= 0 ? 'text-success-text' : 'text-error-text'}>
                      {disposalGainLoss! >= 0 ? 'gain' : 'loss'} of {Math.abs(disposalGainLoss!).toFixed(2)}
                    </span>
                  </>
                ) : (
                  "This asset has no recorded cost basis, so gain/loss can't be computed."
                )}
              </p>
            )}
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea value={disposalNotes} onChange={(e) => setDisposalNotes(e.target.value)} rows={2} />
          </div>
          {disposeError && <p className="text-sm text-error-text">{disposeError}</p>}
        </div>
      </ConfirmModal>
    </div>
  )
}
