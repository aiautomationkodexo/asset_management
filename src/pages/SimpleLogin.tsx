import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useSimpleAuth } from '@/contexts/SimpleAuthContext'
import { getUserStatus, setInitialPassword } from '@/lib/simpleAuth'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { Input } from '@/components/ui/Input'
import { Logo } from '@/components/ui/Logo'
import { buttonClass } from '@/components/ui/buttonStyles'

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.82-.07-1.6-.2-2.36H12v4.47h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3.01h3.86c2.26-2.08 3.59-5.15 3.59-8.74z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.86-3.01c-1.07.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.28v3.11C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.37-2.28V6.61H1.28A11.98 11.98 0 0 0 0 12c0 1.93.46 3.76 1.28 5.39z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.28 6.61l3.99 3.11C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  )
}

export function SimpleLogin() {
  const { isAuthenticated, login, loginWithGoogle, isBridgingGoogle, googleError } = useSimpleAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [needsPassword, setNeedsPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!email.trim()) {
      setNeedsPassword(false)
      return
    }
    const timeout = setTimeout(() => {
      getUserStatus(email.trim()).then((status) => setNeedsPassword(status === 'needs_password'))
    }, 400)
    return () => clearTimeout(timeout)
  }, [email])

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      if (needsPassword) {
        if (password !== confirmPassword) {
          setError('Passwords do not match.')
          return
        }
        const user = await setInitialPassword(email, password)
        if (!user) {
          setError('Could not set password. Try again.')
          return
        }
        await login(email, password)
        return
      }

      const success = await login(email, password)
      if (!success) {
        const status = await getUserStatus(email)
        setError(status === 'not_found' ? 'No account found for this email. Ask an admin to add you.' : 'Invalid email or password.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-bg p-4">
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[480px] w-[720px] -translate-x-1/2 -translate-y-1/3 rounded-radius-xl opacity-30 blur-3xl"
        style={{ backgroundImage: 'var(--brand-gradient-a)' }}
        aria-hidden
      />

      <div className="relative z-10 mb-8">
        <Logo className="h-16 w-auto" />
      </div>

      <Card className="relative z-10 w-full max-w-sm p-8">
        <h1 className="text-h4 mb-1">Sign in</h1>
        <p className="mb-6 text-sm text-text-secondary">Asset management console</p>

        <button
          type="button"
          onClick={loginWithGoogle}
          disabled={isBridgingGoogle}
          className={buttonClass('tertiary', 'w-full mb-4')}
        >
          <GoogleIcon />
          {isBridgingGoogle ? 'Signing in...' : 'Sign in with Google'}
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-divider" />
          <span className="text-xs uppercase tracking-wide text-text-tertiary">or</span>
          <div className="h-px flex-1 bg-divider" />
        </div>

        {googleError && <p className="mb-4 text-sm text-error-text">{googleError}</p>}

        {needsPassword && (
          <p className="mb-4 rounded-radius-md border border-info-border bg-info-bg px-3 py-2 text-sm text-info-text">
            No password set yet for this account. Choose one to finish setting up.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div>
            <Label>{needsPassword ? 'New password' : 'Password'}</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={needsPassword ? 'new-password' : 'current-password'}
            />
          </div>
          {needsPassword && (
            <div>
              <Label>Confirm password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
          )}
          {error && <p className="text-sm text-error-text">{error}</p>}
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Working...' : needsPassword ? 'Set password & sign in' : 'Sign in'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
