import { useRef } from 'react'
import type { ChangeEvent, PointerEvent as ReactPointerEvent } from 'react'

interface SignaturePadProps {
  value: string | null
  onChange: (dataUrl: string | null) => void
}

export function SignaturePad({ value, onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)

  function getPos(e: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    drawingRef.current = true
    const ctx = canvasRef.current!.getContext('2d')!
    const { x, y } = getPos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return
    const ctx = canvasRef.current!.getContext('2d')!
    const { x, y } = getPos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  function handlePointerUp() {
    if (!drawingRef.current) return
    drawingRef.current = false
    onChange(canvasRef.current!.toDataURL('image/png'))
  }

  function clear() {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
    onChange(null)
  }

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => onChange(reader.result as string)
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-2">
      <p className="text-body-xs text-text-secondary">Sign in the box below or upload a signature.</p>
      <canvas
        ref={canvasRef}
        width={320}
        height={120}
        className="touch-none rounded-radius-md border border-border bg-white"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
      <div className="flex items-center gap-3 text-sm">
        <button type="button" onClick={clear} className="text-text-secondary hover:underline">
          Clear
        </button>
        <span className="text-text-tertiary">or</span>
        <label className="cursor-pointer text-brand-red hover:underline">
          Upload signature
          <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
        </label>
      </div>
      {value && <p className="text-xs text-success-text">Signature captured</p>}
    </div>
  )
}
