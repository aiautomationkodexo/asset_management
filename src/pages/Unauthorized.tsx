import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { useSimpleAuth } from '@/contexts/SimpleAuthContext'
import { Card } from '@/components/ui/Card'
import { buttonClass } from '@/components/ui/buttonStyles'

export function Unauthorized() {
  const { logout } = useSimpleAuth()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-alt p-4">
      <Card className="card-in w-full max-w-sm p-8 text-center">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-radius-md bg-error-bg text-error-text">
          <ShieldAlert className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <h1 className="text-h5 mb-2">Access not granted</h1>
        <p className="mb-6 text-sm text-text-secondary">
          Your account doesn't have permission to perform this action.
        </p>
        <Link to="/assets" className={buttonClass('primary', 'mb-3 w-full')}>
          Back to assets
        </Link>
        <button onClick={logout} className={buttonClass('tertiary', 'w-full')}>
          Sign out
        </button>
      </Card>
    </div>
  )
}
