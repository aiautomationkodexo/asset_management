import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useSimpleAuth } from '@/contexts/SimpleAuthContext'
import { getUserStatus, setInitialPassword } from '@/lib/simpleAuth'

export function SimpleLogin() {
  const { isAuthenticated, login } = useSimpleAuth()
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
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-radius-lg border border-border bg-bg-elevated p-8 shadow-md">
        <h1 className="mb-6 text-center text-2xl">Sign in</h1>
        {needsPassword && (
          <p className="mb-4 text-sm text-text-secondary">
            No password set yet for this account. Choose one to finish setting up.
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-radius-md border border-border bg-bg px-3 py-2 text-sm text-text-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              {needsPassword ? 'New password' : 'Password'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={needsPassword ? 'new-password' : 'current-password'}
              className="w-full rounded-radius-md border border-border bg-bg px-3 py-2 text-sm text-text-primary"
            />
          </div>
          {needsPassword && (
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">Confirm password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full rounded-radius-md border border-border bg-bg px-3 py-2 text-sm text-text-primary"
              />
            </div>
          )}
          {error && <p className="text-sm text-error-text">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-radius-md bg-brand-red px-4 py-2 text-sm font-medium text-text-on-brand hover:bg-brand-red-deep disabled:opacity-50"
          >
            {isSubmitting ? 'Working...' : needsPassword ? 'Set password & sign in' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
