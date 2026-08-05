import { Navigate, Outlet } from 'react-router-dom'
import { useSimpleAuth } from '@/contexts/SimpleAuthContext'

export function AdminOnlyRoute() {
  const { isAdmin } = useSimpleAuth()

  if (!isAdmin) {
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet />
}
