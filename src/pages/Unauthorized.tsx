import { Link } from 'react-router-dom'
import { useSimpleAuth } from '@/contexts/SimpleAuthContext'

export function Unauthorized() {
  const { logout } = useSimpleAuth()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="card-in w-full max-w-sm rounded-radius-lg border border-error-border bg-bg-elevated p-8 text-center shadow-md">
        <h1 className="mb-2 text-2xl text-error-text">Access Not Granted</h1>
        <p className="mb-6 text-sm text-text-secondary">
          Your account doesn't have permission to perform this action.
        </p>
        <Link
          to="/assets"
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-radius-md bg-brand-red px-4 py-2 text-sm font-medium text-text-on-brand hover:bg-brand-red-deep"
        >
          Back to assets
        </Link>
        <button
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 rounded-radius-md border border-border bg-bg-alt px-4 py-2 text-sm font-medium text-text-primary hover:bg-border"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
