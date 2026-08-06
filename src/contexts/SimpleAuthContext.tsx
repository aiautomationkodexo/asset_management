import React, { createContext, useContext, useEffect, useState } from 'react'
import type { AuthUser, UserRole } from '@/lib/simpleAuth'
import { authenticate, authenticateByEmail, getStoredSession, setStoredSession } from '@/lib/simpleAuth'
import { supabase } from '@/lib/supabase'

interface SimpleAuthContextType {
  isAuthenticated: boolean
  email: string | null
  role: UserRole | null
  isAdmin: boolean
  isBridgingGoogle: boolean
  googleError: string | null
  login: (email: string, password: string) => Promise<boolean>
  loginWithGoogle: () => Promise<void>
  logout: () => void
}

const SimpleAuthContext = createContext<SimpleAuthContextType | undefined>(undefined)

export function SimpleAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(getStoredSession)
  const [isBridgingGoogle, setIsBridgingGoogle] = useState(false)
  const [googleError, setGoogleError] = useState<string | null>(null)

  useEffect(() => {
    // Google sign-in produces a real Supabase Auth session on redirect back —
    // this app's access control runs entirely on the auth_users-based session
    // above, so bridge the Google-verified email into that session and then
    // discard the Supabase Auth session; nothing else in the app uses it.
    async function bridgeGoogleSession(email: string) {
      setIsBridgingGoogle(true)
      setGoogleError(null)
      const authedUser = await authenticateByEmail(email)
      await supabase.auth.signOut({ scope: 'local' })
      if (authedUser) {
        setStoredSession(authedUser)
        setUser(authedUser)
      } else {
        setGoogleError('No account found for this email. Ask an admin to add you.')
      }
      setIsBridgingGoogle(false)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) bridgeGoogleSession(session.user.email)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email) bridgeGoogleSession(session.user.email)
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    const authedUser = await authenticate(email, password)
    if (!authedUser) return false
    setStoredSession(authedUser)
    setUser(authedUser)
    return true
  }

  const loginWithGoogle = async () => {
    setGoogleError(null)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/login` },
    })
  }

  const logout = () => {
    setStoredSession(null)
    setUser(null)
  }

  return (
    <SimpleAuthContext.Provider
      value={{
        isAuthenticated: !!user,
        email: user?.email ?? null,
        role: user?.role ?? null,
        isAdmin: user?.role === 'admin',
        isBridgingGoogle,
        googleError,
        login,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </SimpleAuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSimpleAuth() {
  const context = useContext(SimpleAuthContext)
  if (context === undefined) {
    throw new Error('useSimpleAuth must be used within a SimpleAuthProvider')
  }
  return context
}
