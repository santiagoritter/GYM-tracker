import { db, ensureProfile } from '@/db/schema'
import { remapUserData } from '@/db/migrateLocalUserToSupabase'
import { useAuthStore } from '@/stores/authStore'
import { wipeLocalData } from '@/lib/deleteAccount'
import { uid } from '@/lib/utils'

/**
 * Modo sin cuenta ("Continuar sin cuenta"). Un revisor de la App Store (o
 * alguien que solo quiere probar) tiene que poder usar la app sin registrarse
 * ni recibir un mail: los datos viven en este dispositivo bajo un id local
 * `guest-<uuid>`, sin sesión de Supabase y sin sync. Si después crea una cuenta
 * (o inicia sesión), `migrateGuestData` mueve todo a su id real.
 */

const GUEST_PREFIX = 'guest-'

export function isGuestUserId(id: string | null | undefined): boolean {
  return typeof id === 'string' && id.startsWith(GUEST_PREFIX)
}

/** Entra al modo sin cuenta: crea el id local y el perfil vacío. */
export async function startGuestMode(): Promise<string> {
  // Si ya hay un invitado con datos, se retoma ese (no se crea otro y se
  // orfanan los datos de la sesión anterior).
  const existing = useAuthStore.getState().guestId
  const id = existing ?? `${GUEST_PREFIX}${uid()}`
  await ensureProfile(id)
  useAuthStore.getState().startGuest(id)
  return id
}

/**
 * Pasa los datos de invitado a la cuenta real recién autenticada. Idempotente:
 * sin `guestId` pendiente no hace nada. Llamar tras el login/registro, antes de
 * decidir a qué pantalla ir.
 */
export async function migrateGuestData(newUserId: string): Promise<void> {
  const { guestId, clearGuestId } = useAuthStore.getState()
  if (!guestId || guestId === newUserId) return
  await remapUserData(guestId, newUserId)
  clearGuestId()
}

/** Borra los datos de este invitado (no de otra cuenta que haya usado el
 * mismo dispositivo) y sale del modo sin cuenta. */
export async function discardGuestData(): Promise<void> {
  const { userId } = useAuthStore.getState()
  if (!userId) return
  await wipeLocalData(userId)
}

/** ¿Hay datos de invitado con contenido real (para avisar antes de perderlos)? */
export async function guestHasData(guestId: string): Promise<boolean> {
  const [workouts, routines] = await Promise.all([
    db.workouts.where('userId').equals(guestId).count(),
    db.routines.where('userId').equals(guestId).count(),
  ])
  return workouts + routines > 0
}
