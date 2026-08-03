import { useAuthStore } from '@/stores/authStore'

/** userId de la sesión activa, o null si no hay nadie logueado. */
export function useCurrentUserId(): string | null {
  return useAuthStore((s) => s.userId)
}
