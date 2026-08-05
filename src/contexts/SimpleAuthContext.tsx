import React, { createContext, useContext, useState } from 'react'
import type { AuthUser, UserRole } from '@/lib/simpleAuth'
import { authenticate, getStoredSession, setStoredSession } from '@/lib/simpleAuth'

interface SimpleAuthContextType {
  isAuthenticated: boolean
  email: string | null
  role: UserRole | null
  isAdmin: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
}

const SimpleAuthContext = createContext<SimpleAuthContextType | undefined>(undefined)

export function SimpleAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(getStoredSession)

  const login = async (email: string, password: string) => {
    const authedUser = await authenticate(email, password)
    if (!authedUser) return false
    setStoredSession(authedUser)
    setUser(authedUser)
    return true
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
        login,
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
