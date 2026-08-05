import React, { createContext, useContext, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  session: Session | null
  isAdmin: boolean | null
  isLoading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithPassword: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  async function checkAdminStatus(currentSession: Session | null) {
    if (!currentSession) {
      setIsAdmin(false)
      setIsLoading(false)
      return
    }

    try {
      // Check if user is admin via RPC
      const { data, error } = await supabase.rpc('is_admin')
      if (error) throw error
      setIsAdmin(!!data)
    } catch (error) {
      console.error('Error checking admin status:', error)
      setIsAdmin(false)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      checkAdminStatus(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      checkAdminStatus(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })
  }

  const signInWithPassword = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signOut = async () => {
    // 'local' only ends this browser's session. The default 'global' scope
    // asks GoTrue to revoke every session for the user across all devices,
    // which is unnecessary for a single admin console and can 403 if the
    // server's session bookkeeping doesn't line up with this exact token.
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (error) {
      console.error('Sign-out failed:', error)
    }
  }

  return (
    <AuthContext.Provider
      value={{ session, isAdmin, isLoading, signInWithGoogle, signInWithPassword, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
