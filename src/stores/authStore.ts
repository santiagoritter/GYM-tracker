import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserRole } from '@/types'

interface AuthState {
  userId: string | null
  role: UserRole | null
  name: string | null
  setSession: (userId: string, role: UserRole, name: string) => void
  clearSession: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userId: null,
      role: null,
      name: null,
      setSession: (userId, role, name) => set({ userId, role, name }),
      clearSession: () => set({ userId: null, role: null, name: null }),
    }),
    { name: 'gymtracker-auth' }
  )
)
