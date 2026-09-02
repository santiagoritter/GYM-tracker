import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserRole } from '@/types'

interface AuthState {
  userId: string | null
  role: UserRole | null
  name: string | null
  email: string | null
  /**
   * `true` una vez que la sesión viva de Supabase se resolvió en este arranque
   * (o de inmediato si Supabase no está configurado). Hasta entonces, `role`
   * viene de localStorage y podría estar viejo — `AdminRoute` no muestra el
   * panel hasta que esto sea `true`. NO se persiste: cada carga arranca en
   * `false` y `main.tsx` lo pone en `true`.
   */
  sessionChecked: boolean
  setSession: (userId: string, role: UserRole, name: string, email: string) => void
  clearSession: () => void
  markSessionChecked: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userId: null,
      role: null,
      name: null,
      email: null,
      sessionChecked: false,
      setSession: (userId, role, name, email) =>
        set({ userId, role, name, email, sessionChecked: true }),
      clearSession: () =>
        set({ userId: null, role: null, name: null, email: null, sessionChecked: true }),
      markSessionChecked: () => set({ sessionChecked: true }),
    }),
    {
      name: 'gymtracker-auth',
      partialize: (s) => ({ userId: s.userId, role: s.role, name: s.name, email: s.email }),
    }
  )
)
