import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export function ProtectedRoute() {
  const { session, isAdmin, isLoading } = useAuth()

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-bg text-text-secondary">Loading...</div>
  }

  // If not authenticated, redirect to login
  if (!session) {
    return <Navigate to="/login" replace />
  }

  // If authenticated but not admin, show unauthorized
  if (!isAdmin) {
    return <Navigate to="/unauthorized" replace />
  }

  // If authenticated and admin, render child routes
  return <Outlet />
}
