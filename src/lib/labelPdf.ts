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

const TAG_FONT_SIZE_MAX = 8
const TAG_FONT_SIZE_MIN = 5

// Shrinks the font size (never below TAG_FONT_SIZE_MIN) until the tag fits
// on one line within maxWidthMm — avoids jsPDF's default wrap-to-next-line
// behavior, which pushes text outside the label's fixed height.
function fitTagFontSize(doc: jsPDF, text: string, maxWidthMm: number): number {
  let size = TAG_FONT_SIZE_MAX
  doc.setFontSize(size)
  while (size > TAG_FONT_SIZE_MIN && doc.getTextWidth(text) > maxWidthMm) {
    size -= 0.5
    doc.setFontSize(size)
  }
  return size
}

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
  const qrSizeMm = Math.min(labelWidthMm, labelHeightMm) - 8

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

    const textX = x + qrSizeMm + 4
    const textMaxWidth = labelWidthMm - qrSizeMm - 5

    const tagFontSize = fitTagFontSize(doc, asset.asset_tag, textMaxWidth)
    doc.setFontSize(tagFontSize)
    doc.text(asset.asset_tag, textX, y + labelHeightMm / 2 - 2)

    doc.setFontSize(6)
    doc.text(OWNERSHIP_LINE, textX, y + labelHeightMm / 2 + 4, { maxWidth: textMaxWidth })
  }

  return doc
}

// Prints a jsPDF document via a hidden iframe's own print dialog, instead of
// forcing a file download — the browser's native PDF viewer inside the
// iframe handles rendering, so this works the same as printing any PDF.
export function printPdf(doc: jsPDF) {
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)

  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = 'none'
  iframe.src = url
  document.body.appendChild(iframe)

  const cleanup = () => {
    if (iframe.parentNode) document.body.removeChild(iframe)
    URL.revokeObjectURL(url)
  }

  iframe.onload = () => {
    // The PDF viewer needs a moment to finish rendering before print()
    // actually opens the dialog — calling it immediately on load is a
    // known no-op in Chrome/Edge.
    setTimeout(() => {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
    }, 150)
    iframe.contentWindow?.addEventListener('afterprint', cleanup)
    setTimeout(cleanup, 60000)
  }
}
