import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export function ProtectedRoute() {
  const userId = useAuthStore((s) => s.userId)
  if (!userId) return <Navigate to="/login" replace />
  return <Outlet />
}

export function AdminRoute() {
  const role = useAuthStore((s) => s.role)
  if (role !== 'admin') return <Navigate to="/" replace />
  return <Outlet />
}
