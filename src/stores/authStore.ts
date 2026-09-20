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
  /** Modo sin cuenta: `userId` es un id local (`guest-…`), sin sesión de Supabase. */
  isGuest: boolean
  /** Id de invitado que todavía tiene datos por migrar a una cuenta real. Se
   * conserva después de registrarse/iniciar sesión hasta que `guest.ts` mueve
   * los datos (el listener de auth pisa `userId` antes de que eso corra). */
  guestId: string | null
  startGuest: (guestId: string) => void
  clearGuestId: () => void
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
      isGuest: false,
      guestId: null,
      startGuest: (guestId) =>
        set({ userId: guestId, role: 'user', name: 'Invitado', email: null, isGuest: true, guestId, sessionChecked: true }),
      clearGuestId: () => set({ guestId: null }),
      setSession: (userId, role, name, email) =>
        set({ userId, role, name, email, isGuest: false, sessionChecked: true }),
      clearSession: () =>
        set({ userId: null, role: null, name: null, email: null, isGuest: false, sessionChecked: true }),
      markSessionChecked: () => set({ sessionChecked: true }),
    }),
    {
      name: 'gymtracker-auth',
      partialize: (s) => ({
        userId: s.userId,
        role: s.role,
        name: s.name,
        email: s.email,
        isGuest: s.isGuest,
        guestId: s.guestId,
      }),
    }
  )
)
