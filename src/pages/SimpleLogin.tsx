import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useSimpleAuth } from '@/contexts/SimpleAuthContext'
import { getUserStatus, setInitialPassword } from '@/lib/simpleAuth'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { Input } from '@/components/ui/Input'

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
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-bg p-4">
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[480px] w-[720px] -translate-x-1/2 -translate-y-1/3 rounded-radius-xl opacity-30 blur-3xl"
        style={{ backgroundImage: 'var(--brand-gradient-a)' }}
        aria-hidden
      />

      <div className="relative z-10 mb-8 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-radius-pill bg-brand-red" />
        <span className="font-heading text-lg font-semibold text-text-strong">Kodexo Labs</span>
      </div>

      <Card className="relative z-10 w-full max-w-sm p-8">
        <h1 className="text-h4 mb-1">Sign in</h1>
        <p className="mb-6 text-sm text-text-secondary">Asset management console</p>

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
