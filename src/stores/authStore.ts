import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserRole } from '@/types'

interface AuthState {
  userId: string | null
  role: UserRole | null
  name: string | null
  email: string | null
  setSession: (userId: string, role: UserRole, name: string, email: string) => void
  clearSession: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userId: null,
      role: null,
      name: null,
      email: null,
      setSession: (userId, role, name, email) => set({ userId, role, name, email }),
      clearSession: () => set({ userId: null, role: null, name: null, email: null }),
    }),
    { name: 'gymtracker-auth' }
  )
)
