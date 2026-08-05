import { Navigate, Outlet } from 'react-router-dom'
import { useSimpleAuth } from '@/contexts/SimpleAuthContext'

export function SimpleProtectedRoute() {
  const { isAuthenticated } = useSimpleAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
