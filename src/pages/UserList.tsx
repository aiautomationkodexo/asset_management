import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import type { UserRole } from '@/lib/simpleAuth'
import { useSimpleAuth } from '@/contexts/SimpleAuthContext'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Label } from '@/components/ui/Label'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { buttonClass } from '@/components/ui/buttonStyles'
import { ShieldCheck, Trash2 } from 'lucide-react'

interface UserRow {
  id: number
  email: string
  role: UserRole
  password: string | null
  is_active: boolean
}

export function UserList() {
  const { email: currentEmail } = useSimpleAuth()
  const [users, setUsers] = useState<UserRow[]>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('user')
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [pendingRemoval, setPendingRemoval] = useState<UserRow | null>(null)

  function load() {
    supabase
      .from('auth_users')
      .select('id, email, role, password, is_active')
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

  async function confirmRemoval() {
    if (!pendingRemoval) return
    setIsRemoving(true)
    setError(null)
    const { error } = await supabase.from('auth_users').update({ is_active: false }).eq('id', pendingRemoval.id)
    setIsRemoving(false)
    if (error) {
      setError(error.message)
      return
    }
    setSuccessMessage(`${pendingRemoval.email} has been removed and can no longer sign in.`)
    setPendingRemoval(null)
    load()
    setTimeout(() => setSuccessMessage(null), 4000)
  }

  return (
    <div className="p-4 sm:p-8">
      <PageHeader kicker="Admin" title="Settings" subtitle="Users" />

      <Card as="form" onSubmit={handleAdd} className="card-in mb-6 flex max-w-lg flex-wrap items-end gap-3 p-4">
        <div className="min-w-[200px] flex-1">
          <Label>Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <Label>Role</Label>
          <Select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
            <option value="user">user</option>
            <option value="admin">admin</option>
          </Select>
        </div>
        <button type="submit" disabled={isSaving} className={buttonClass('primary')}>
          {isSaving ? 'Adding...' : 'Add user'}
        </button>
      </Card>

      {error && <p className="mb-4 text-sm text-error-text">{error}</p>}
      {successMessage && <p className="mb-4 text-sm text-success-text">{successMessage}</p>}

      <Card className="max-w-lg overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="border-b border-border bg-bg-alt text-left text-text-secondary">
            <tr>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-text-secondary">
                  Loading...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <EmptyState icon={ShieldCheck} title="No users yet" description="Add the first user above." />
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b border-divider last:border-0 hover:bg-bg-alt">
                  <td className="px-4 py-3 text-text-primary">{u.email}</td>
                  <td className="px-4 py-3 text-text-primary">{u.role}</td>
                  <td className="px-4 py-3">
                    <Badge tone={!u.is_active ? 'neutral' : u.password ? 'success' : 'warning'}>
                      {!u.is_active ? 'Removed' : u.password ? 'Active' : 'Pending setup'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.is_active && (
                      <button
                        onClick={() => setPendingRemoval(u)}
                        disabled={u.email.toLowerCase() === currentEmail?.toLowerCase()}
                        title={u.email.toLowerCase() === currentEmail?.toLowerCase() ? "You can't remove your own account" : 'Remove user'}
                        className={buttonClass('danger', 'px-2 py-1')}
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </Card>

      <ConfirmModal
        open={pendingRemoval !== null}
        title="Remove admin"
        description={pendingRemoval ? `Remove ${pendingRemoval.email}? They will no longer be able to sign in.` : undefined}
        confirmLabel="Remove admin"
        onConfirm={confirmRemoval}
        onCancel={() => setPendingRemoval(null)}
        isSaving={isRemoving}
      />
    </div>
  )
}
