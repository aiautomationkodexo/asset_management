import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Navigate } from 'react-router-dom'

export function Login() {
  const { session, signInWithGoogle, signInWithPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (session) {
    return <Navigate to="/" replace />
  }

  async function handlePasswordLogin(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await signInWithPassword(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="card-in w-full max-w-sm rounded-radius-lg border border-border bg-bg-elevated p-8 shadow-md">
        <h1 className="mb-6 text-center text-2xl">Internal Asset Management</h1>
        <button
          onClick={signInWithGoogle}
          className="flex w-full items-center justify-center gap-2 rounded-radius-md bg-brand-red px-4 py-2 text-sm font-medium text-text-on-brand hover:bg-brand-red-deep"
        >
          Sign in with Google
        </button>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-divider" />
          <span className="text-xs uppercase tracking-wide text-text-tertiary">or</span>
          <div className="h-px flex-1 bg-divider" />
        </div>

        <form onSubmit={handlePasswordLogin} className="space-y-3">
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
            <label className="mb-1 block text-sm font-medium text-text-primary">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-radius-md border border-border bg-bg px-3 py-2 text-sm text-text-primary"
            />
          </div>
          {error && <p className="text-sm text-error-text">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-radius-md border border-border bg-bg-alt px-4 py-2 text-sm font-medium text-text-primary hover:bg-border disabled:opacity-50"
          >
            {isSubmitting ? 'Signing in...' : 'Sign in with email'}
          </button>
        </form>
      </div>
    </div>
  )
}
