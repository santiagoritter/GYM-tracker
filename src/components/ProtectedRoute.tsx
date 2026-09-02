import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export function ProtectedRoute() {
  const userId = useAuthStore((s) => s.userId)
  if (!userId) return <Navigate to="/login" replace />
  return <Outlet />
}

export function AdminRoute() {
  const role = useAuthStore((s) => s.role)
  const sessionChecked = useAuthStore((s) => s.sessionChecked)
  // No mostrar el panel con un `role` persistido que todavía no confirmó la
  // sesión viva de Supabase (podría estar viejo o manipulado en localStorage).
  // El acceso real a datos ajenos ya lo protege RLS server-side; esto es para
  // que la UI de admin no parpadee antes de tiempo.
  if (!sessionChecked) return null
  if (role !== 'admin') return <Navigate to="/" replace />
  return <Outlet />
}
