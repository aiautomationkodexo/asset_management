import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Card } from '@/components/ui/Card'
import { buttonClass } from '@/components/ui/buttonStyles'

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  isSaving = false,
  confirmDisabled = false,
  children,
}: {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  isSaving?: boolean
  confirmDisabled?: boolean
  children?: ReactNode
}) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    cancelRef.current?.focus()

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onMouseDown={onCancel}
    >
      <Card
        as="div"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
        className="card-in w-full max-w-sm p-6"
      >
        <h2 id="confirm-modal-title" className="text-h6 mb-2">
          {title}
        </h2>
        {description && <p className="mb-4 text-sm text-text-secondary">{description}</p>}
        {children && <div className="mb-4">{children}</div>}
        <div className="flex justify-end gap-3">
          <button ref={cancelRef} onClick={onCancel} className={buttonClass('tertiary')}>
            {cancelLabel}
          </button>
          <button onClick={onConfirm} disabled={isSaving || confirmDisabled} className={buttonClass('primary')}>
            {isSaving ? 'Working...' : confirmLabel}
          </button>
        </div>
      </Card>
    </div>
  )
}
