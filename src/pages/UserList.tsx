import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import type { UserRole } from '@/lib/simpleAuth'

interface UserRow {
  id: number
  email: string
  role: UserRole
  password: string | null
}

const FIELD_CLASS = 'rounded-radius-md border border-border bg-bg px-3 py-2 text-sm text-text-primary'

export function UserList() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('user')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  function load() {
    supabase
      .from('auth_users')
      .select('id, email, role, password')
      .order('email')
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setUsers((data ?? []) as UserRow[])
        setIsLoading(false)
      })
  }

  useEffect(load, [])

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSaving(true)
    const { error } = await supabase.from('auth_users').insert({ email: email.trim(), role, password: null })
    setIsSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setEmail('')
    setRole('user')
    load()
  }

  return (
    <div className="p-8">
      <h1 className="mb-6 text-3xl">Users</h1>

      <form onSubmit={handleAdd} className="card-in mb-6 flex max-w-lg items-end gap-3 rounded-radius-lg border border-border bg-bg-elevated p-4 shadow-sm">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-text-primary">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={`w-full ${FIELD_CLASS}`}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-text-primary">Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className={FIELD_CLASS}>
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-radius-md bg-brand-red px-4 py-2 text-sm font-medium text-text-on-brand hover:bg-brand-red-deep disabled:opacity-50"
        >
          {isSaving ? 'Adding...' : 'Add user'}
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-error-text">{error}</p>}

      <div className="max-w-lg overflow-hidden rounded-radius-lg border border-border bg-bg-elevated shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-bg-alt text-left text-text-secondary">
            <tr>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-text-secondary">
                  Loading...
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b border-divider last:border-0">
                  <td className="px-4 py-3 text-text-primary">{u.email}</td>
                  <td className="px-4 py-3 text-text-primary">{u.role}</td>
                  <td className="px-4 py-3">
                    {u.password ? (
                      <span className="text-success-text">Active</span>
                    ) : (
                      <span className="text-warning-text">Pending setup</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
