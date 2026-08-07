import { supabase } from '@/lib/supabase'

const SESSION_KEY = 'simple-auth-session'

export type UserRole = 'admin' | 'user'

export interface AuthUser {
  email: string
  role: UserRole
}

export type UserStatus = 'not_found' | 'needs_password' | 'has_password'

const UNDEFINED_COLUMN = '42703'

// auth_users.is_active has been asked for as a migration multiple times this
// project without landing — rather than let a missing column silently lock
// every account out of login, retry once without the filter and warn loudly.
// Once the column actually exists, the first attempt succeeds and this never
// triggers.
async function withActiveFilterFallback<T>(
  runQuery: (filterActive: boolean) => PromiseLike<{ data: T; error: { code?: string; message: string } | null }>
): Promise<{ data: T; error: { code?: string; message: string } | null }> {
  const result = await runQuery(true)
  if (result.error?.code === UNDEFINED_COLUMN) {
    console.warn(
      'auth_users.is_active is missing — login is proceeding without the active-account check. ' +
        'Run: alter table public.auth_users add column if not exists is_active boolean not null default true;'
    )
    return runQuery(false)
  }
  return result
}

export async function getUserStatus(email: string): Promise<UserStatus> {
  const { data, error } = await withActiveFilterFallback((filterActive) => {
    let query = supabase.from('auth_users').select('password').ilike('email', email)
    if (filterActive) query = query.eq('is_active', true)
    return query.maybeSingle()
  })

  if (error || !data) return 'not_found'
  return data.password ? 'has_password' : 'needs_password'
}

export async function authenticate(email: string, password: string): Promise<AuthUser | null> {
  const { data, error } = await withActiveFilterFallback((filterActive) => {
    let query = supabase.from('auth_users').select('email, role, password').ilike('email', email)
    if (filterActive) query = query.eq('is_active', true)
    return query.maybeSingle()
  })

  if (error || !data || !data.password || data.password !== password) return null
  return { email: data.email, role: data.role as UserRole }
}

// For Google sign-in: Google has already verified the email, so no password
// check is needed — just confirm an admin has added this email to auth_users
// and it hasn't been deactivated.
export async function authenticateByEmail(email: string): Promise<AuthUser | null> {
  const { data, error } = await withActiveFilterFallback((filterActive) => {
    let query = supabase.from('auth_users').select('email, role').ilike('email', email)
    if (filterActive) query = query.eq('is_active', true)
    return query.maybeSingle()
  })

  if (error || !data) return null
  return { email: data.email, role: data.role as UserRole }
}

// Only succeeds for a row an admin already created (email exists) that has
// never had a password set — never overwrites an existing password.
export async function setInitialPassword(email: string, password: string): Promise<AuthUser | null> {
  const { data, error } = await withActiveFilterFallback((filterActive) => {
    let query = supabase.from('auth_users').update({ password }).ilike('email', email)
    if (filterActive) query = query.eq('is_active', true)
    return query.is('password', null).select('email, role').maybeSingle()
  })

  if (error || !data) return null
  return { email: data.email, role: data.role as UserRole }
}

export function getStoredSession(): AuthUser | null {
  const raw = sessionStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function setStoredSession(session: AuthUser | null) {
  if (session) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } else {
    sessionStorage.removeItem(SESSION_KEY)
  }
}
