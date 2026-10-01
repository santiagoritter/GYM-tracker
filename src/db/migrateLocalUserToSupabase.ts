import { db, SYNC_ORDER } from '@/db/schema'
import { remapOwner } from '@/lib/backup'
import { useAuthStore } from '@/stores/authStore'

interface SyncedRow {
  id: string
  userId: string
}

/**
 * El id de una sesión de Supabase (`auth.uid()`, asignado en el signup)
 * no tiene ninguna relación con el `uid()` local que ya tenían todas las
 * filas de esta cuenta si venía usando la app sin login real. Sin este
 * paso, `src/db/scoped.ts` (que filtra TODO por `userId`) deja de
 * encontrar esas filas apenas cambia el id activo — no se borran, pero
 * desaparecen de la vista. Es el paso de mayor riesgo de toda la
 * migración a Supabase Auth.
 *
 * Reutiliza `remapOwner` de `lib/backup.ts` — es el mismo problema que ya
 * resuelve el import de un backup (reasignar filas de un userId a otro,
 * incluidas las claves compuestas de `personalRecords`/`exercisePhotos`
 * y la PK de `profile`), no hacía falta reinventarlo acá.
 *
 * Se dispara en cada login/signup exitoso; es un no-op si no hay una
 * cuenta local vieja con el mismo email, o si ya se migró antes (el
 * `users` local se borra al final, así que la segunda vez no encuentra
 * nada que mover).
 */
export async function migrateLocalUserToSupabase(newUserId: string, email: string): Promise<void> {
  const normalized = email.toLowerCase().trim()
  const legacyUser = await db.users.where('email').equals(normalized).first()
  if (!legacyUser || legacyUser.id === newUserId) return
  await remapUserData(legacyUser.id, newUserId)
}

/** Ante una colisión de id: un PR es un máximo, gana el mayor 1RM; el resto
 * (perfil, foto de ejercicio) gana el más nuevo, y ante la duda el que ya
 * estaba (suele venir del servidor). */
export function incomingWins(
  table: string,
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>
): boolean {
  if (table === 'personalRecords') {
    return Number(incoming.oneRmKg ?? 0) > Number(existing.oneRmKg ?? 0)
  }
  const a = typeof incoming.updatedAt === 'string' ? incoming.updatedAt : ''
  const b = typeof existing.updatedAt === 'string' ? existing.updatedAt : ''
  return a > b
}

/**
 * Pasa TODO lo que hay bajo `oldUserId` a `newUserId`: filas de todas las tablas
 * sincronizadas (incluida la PK del perfil y las claves compuestas), tombstones
 * pendientes y el registro local de auth del usuario viejo. Lo comparten la
 * migración de una cuenta local vieja y la del modo invitado (`guest.ts`): en
 * los dos casos los datos ya existen en este dispositivo bajo otro id y hay que
 * moverlos sin perder ni duplicar nada.
 */
export async function remapUserData(oldUserId: string, newUserId: string): Promise<void> {
  if (oldUserId === newUserId) return

  await db.transaction(
    'rw',
    [db.users, db.emailVerifications, db.tombstones, db.runs, ...SYNC_ORDER.map((t) => db.table(t))],
    async () => {
      for (const table of SYNC_ORDER) {
        const t = db.table<SyncedRow>(table)
        const rows =
          table === 'profile'
            ? await t.get(oldUserId).then((r) => (r ? [r] : []))
            : await t.where('userId').equals(oldUserId).toArray()

        for (const row of rows) {
          // dirty: 1 explícito: el hook de `creating` respeta un `dirty: 0`
          // heredado, y una fila que ahora es de la cuenta real tiene que subir.
          const moved: Record<string, unknown> = {
            ...remapOwner(table, row as unknown as Record<string, unknown>, newUserId),
            dirty: 1,
          }
          // `profile`, `personalRecords` y `exercisePhotos` tienen id derivado del
          // userId: puede existir ya una fila con el id destino (bajada de otro
          // dispositivo). Antes el `put` la pisaba sin mirar — se perdía un PR o
          // el perfil real. Ahora se queda la que corresponde.
          const existing = moved.id === row.id ? undefined : await t.get(moved.id as string)
          await t.delete(row.id)
          if (!existing || incomingWins(table, existing as unknown as Record<string, unknown>, moved)) {
            await t.put(moved as never)
          }
        }
      }

      // Las salidas a correr con su recorrido GPS son solo locales (no están en
      // SYNC_ORDER) pero también tienen dueño: sin esto quedaban huérfanas.
      const runs = await db.runs.where('userId').equals(oldUserId).toArray()
      for (const run of runs) {
        await db.runs.update(run.id, { userId: newUserId })
      }

      // Tombstones de borrados pendientes de propagar bajo el id viejo.
      const tombstones = await db.tombstones.where('userId').equals(oldUserId).toArray()
      for (const tomb of tombstones) {
        await db.tombstones.update(tomb.id, { userId: newUserId })
      }

      // El registro local de auth (contraseña, código OTP) queda
      // obsoleto: ya autenticó contra Supabase, y dejarlo abierto
      // habilitaría loguear con el flujo viejo sobre datos que ya se
      // movieron de dueño.
      await db.users.delete(oldUserId)
      await db.emailVerifications.delete(oldUserId)
    }
  )
}

export interface RecoverableAccount {
  id: string
  /** Etiqueta para mostrar: el email de la cuenta local vieja, o "Modo sin cuenta". */
  label: string
  workouts: number
}

/**
 * Historial que quedó en este dispositivo bajo otro id y que la cuenta actual
 * puede reclamar. Solo dos orígenes, a propósito: el modo invitado (`guest-…`)
 * y las cuentas locales viejas (tabla `users`). Nunca otra cuenta real de
 * Supabase que haya usado el mismo dispositivo: esos datos son de otra persona.
 */
export async function findRecoverableAccounts(currentUserId: string): Promise<RecoverableAccount[]> {
  const legacy = await db.users.toArray()
  const labels = new Map<string, string>(legacy.map((u) => [u.id, u.email]))
  const ownersWithData = new Set<string>()
  await db.workouts.each((w) => ownersWithData.add(w.userId))
  for (const id of ownersWithData) {
    // Mismo prefijo que guest.ts (no se importa: guest.ts importa este módulo).
    if (id.startsWith('guest-')) labels.set(id, 'Modo sin cuenta')
  }

  const out: RecoverableAccount[] = []
  for (const [id, label] of labels) {
    if (id === currentUserId) continue
    const workouts = await db.workouts.where('userId').equals(id).count()
    if (workouts > 0) out.push({ id, label, workouts })
  }
  return out.sort((a, b) => b.workouts - a.workouts)
}

/**
 * Reintento silencioso al arrancar con sesión real. El remapeo corre en una
 * transacción (si falla no deja nada a medias), pero antes solo se llamaba
 * desde Login/Registro/ForgotPassword: si fallaba una vez, la sesión ya
 * quedaba guardada, esas pantallas no volvían a aparecer y el historial
 * quedaba invisible para siempre. Las dos funciones son no-op si no hay nada
 * que mover, así que correrlo en cada arranque es seguro.
 */
export async function retryPendingMigrations(userId: string, email: string): Promise<void> {
  await migrateLocalUserToSupabase(userId, email)
  const { guestId, clearGuestId } = useAuthStore.getState()
  if (guestId && guestId !== userId) {
    await remapUserData(guestId, userId)
    clearGuestId()
  }
}
