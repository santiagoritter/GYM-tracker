import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/schema'
import { isMinor } from '@/lib/age'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'

/**
 * ¿Aplican las reglas para menores? `true` también mientras carga el perfil o
 * si no hay fecha de nacimiento válida (lib/age.ts): el fallo seguro es
 * tratar a alguien como menor, nunca al revés.
 */
export function useIsMinor(): boolean {
  const userId = useCurrentUserId()
  const dob = useLiveQuery(async () => (userId ? (await db.profile.get(userId))?.dob ?? null : null), [userId])
  return isMinor(dob)
}
