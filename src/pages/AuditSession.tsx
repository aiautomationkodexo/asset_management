import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { AuditSession as AuditSessionType, AuditScan } from '@/types/audit'

interface ExpectedAsset {
  id: string
  asset_tag: string
}

export function AuditSession() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState<AuditSessionType | null>(null)
  const [expected, setExpected] = useState<ExpectedAsset[]>([])
  const [scans, setScans] = useState<AuditScan[]>([])
  const [input, setInput] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [cameraSupported] = useState(() => 'BarcodeDetector' in window)
  const [cameraOn, setCameraOn] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function load() {
    if (!id) return
    supabase
      .from('audit_sessions')
      .select('*')
      .eq('id', id)
      .single()
      .then(async ({ data: sess }) => {
        setSession(sess as AuditSessionType)
        let query = supabase.from('assets').select('id, asset_tag').is('deleted_at', null).neq('status', 'disposed')
        if (sess?.location_id) query = query.eq('location_id', sess.location_id)
        const { data: exp } = await query
        setExpected((exp ?? []) as ExpectedAsset[])
      })
    supabase
      .from('audit_scans')
      .select('*')
      .eq('session_id', id)
      .order('scanned_at', { ascending: false })
      .then(({ data }) => setScans((data ?? []) as AuditScan[]))
  }

  useEffect(load, [id])
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const scannedAssetIds = new Set(scans.filter((s) => s.asset_id).map((s) => s.asset_id))
  const scannedCount = scannedAssetIds.size
  const remaining = expected.filter((a) => !scannedAssetIds.has(a.id)).length

  async function handleScan(rawSlug: string) {
    const slug = rawSlug.trim()
    if (!slug || !id) return
    setInput('')

    const { data: asset } = await supabase.from('assets').select('id, asset_tag').eq('public_slug', slug).maybeSingle()

    await supabase.from('audit_scans').insert({
      session_id: id,
      scanned_slug: slug,
      asset_id: asset?.id ?? null,
    })

    setMessage(asset ? `Scanned ${asset.asset_tag}` : `Unrecognized slug "${slug}" — not registered`)
    load()
  }

  useEffect(() => {
    if (!cameraOn || !cameraSupported) return
    let stream: MediaStream | null = null
    let raf = 0
    let stopped = false

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((s) => {
        stream = s
        if (videoRef.current) {
          videoRef.current.srcObject = s
          videoRef.current.play()
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Detector = (window as any).BarcodeDetector
        const detector = new Detector({ formats: ['qr_code'] })

        const tick = async () => {
          if (stopped || !videoRef.current) return
          try {
            const codes = await detector.detect(videoRef.current)
            if (codes.length > 0) {
              const raw: string = codes[0].rawValue
              const slug = raw.split('/a/')[1]?.split(/[/?#]/)[0]
              if (slug) void handleScan(slug)
            }
          } catch {
            // ignore transient detect errors between frames
          }
          raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      })
      .catch(() => setCameraOn(false))

    return () => {
      stopped = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOn])

  async function closeSession() {
    await supabase.from('audit_sessions').update({ closed_at: new Date().toISOString() }).eq('id', id)
    navigate(`/audit/${id}/report`)
  }

  if (!session) return <div className="p-8 text-text-secondary">Loading...</div>

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl">Audit sweep</h1>
        {!session.closed_at && (
          <button
            onClick={closeSession}
            className="rounded-radius-md bg-brand-red px-4 py-2 text-sm font-medium text-text-on-brand hover:bg-brand-red-deep"
          >
            Close session
          </button>
        )}
        {session.closed_at && (
          <Link to={`/audit/${id}/report`} className="text-sm text-brand-red hover:underline">
            View closing report
          </Link>
        )}
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4 sm:max-w-md">
        <div className="rounded-radius-lg border border-border bg-bg-elevated p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-text-strong">{expected.length}</p>
          <p className="text-xs text-text-secondary">Expected</p>
        </div>
        <div className="rounded-radius-lg border border-border bg-bg-elevated p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-success-text">{scannedCount}</p>
          <p className="text-xs text-text-secondary">Scanned</p>
        </div>
        <div className="rounded-radius-lg border border-border bg-bg-elevated p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-warning-text">{remaining}</p>
          <p className="text-xs text-text-secondary">Remaining</p>
        </div>
      </div>

      {!session.closed_at && (
        <div className="mb-6 max-w-md space-y-3">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleScan(input)
            }}
            placeholder="Scan or type public slug, then Enter"
            autoFocus
            className="w-full rounded-radius-md border border-border bg-bg px-3 py-3 text-lg text-text-primary"
          />
          {cameraSupported && (
            <button
              onClick={() => setCameraOn((v) => !v)}
              className="rounded-radius-md border border-border bg-bg-alt px-4 py-2 text-sm font-medium text-text-primary hover:bg-border"
            >
              {cameraOn ? 'Stop camera' : 'Use camera'}
            </button>
          )}
          {cameraOn && <video ref={videoRef} className="w-full rounded-radius-md border border-border" muted />}
          {message && <p className="text-sm text-text-secondary">{message}</p>}
        </div>
      )}

      <h2 className="mb-2 text-lg">Recent scans</h2>
      <ul className="max-w-md space-y-1 text-sm">
        {scans.slice(0, 15).map((s) => (
          <li key={s.id} className={s.asset_id ? 'text-text-primary' : 'text-error-text'}>
            {s.scanned_slug} — {new Date(s.scanned_at).toLocaleTimeString()}
          </li>
        ))}
      </ul>
    </div>
  )
}
