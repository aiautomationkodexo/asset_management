import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'

export interface LabelAsset {
  asset_tag: string
  public_slug: string
}

export interface LabelGridOptions {
  columns: number
  rows: number
  labelWidthMm: number
  labelHeightMm: number
}

export const DEFAULT_LABEL_GRID: LabelGridOptions = {
  columns: 5,
  rows: 11,
  labelWidthMm: 40,
  labelHeightMm: 25,
}

const OWNERSHIP_LINE = 'Property of Kodexo Labs'

export async function generateLabelsPdf(
  assets: LabelAsset[],
  origin: string,
  grid: LabelGridOptions = DEFAULT_LABEL_GRID
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const { columns, rows, labelWidthMm, labelHeightMm } = grid
  const marginX = Math.max((pageWidth - columns * labelWidthMm) / 2, 0)
  const marginY = Math.max((pageHeight - rows * labelHeightMm) / 2, 0)
  const perPage = columns * rows
  const qrSizeMm = Math.min(labelWidthMm, labelHeightMm) - 6

  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i]
    const positionOnPage = i % perPage
    if (i > 0 && positionOnPage === 0) doc.addPage()

    const col = positionOnPage % columns
    const row = Math.floor(positionOnPage / columns)
    const x = marginX + col * labelWidthMm
    const y = marginY + row * labelHeightMm

    const publicUrl = `${origin}/a/${asset.public_slug}`
    // eslint-disable-next-line no-await-in-loop
    const qrDataUrl = await QRCode.toDataURL(publicUrl, { errorCorrectionLevel: 'M', margin: 4, width: 256 })

    doc.setDrawColor(200)
    doc.rect(x, y, labelWidthMm, labelHeightMm)
    doc.addImage(qrDataUrl, 'PNG', x + 2, y + (labelHeightMm - qrSizeMm) / 2, qrSizeMm, qrSizeMm)

    const textX = x + qrSizeMm + 5
    const textMaxWidth = labelWidthMm - qrSizeMm - 6
    doc.setFontSize(8)
    doc.text(asset.asset_tag, textX, y + labelHeightMm / 2 - 2, { maxWidth: textMaxWidth })
    doc.setFontSize(6)
    doc.text(OWNERSHIP_LINE, textX, y + labelHeightMm / 2 + 4, { maxWidth: textMaxWidth })
  }

  return doc
}
