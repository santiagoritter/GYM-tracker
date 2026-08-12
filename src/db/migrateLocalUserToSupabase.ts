import { db, SYNC_ORDER } from '@/db/schema'
import { remapOwner } from '@/lib/backup'

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

  const oldUserId = legacyUser.id

  await db.transaction(
    'rw',
    [db.users, db.emailVerifications, db.tombstones, ...SYNC_ORDER.map((t) => db.table(t))],
    async () => {
      for (const table of SYNC_ORDER) {
        const t = db.table<SyncedRow>(table)
        const rows =
          table === 'profile'
            ? await t.get(oldUserId).then((r) => (r ? [r] : []))
            : await t.where('userId').equals(oldUserId).toArray()

        for (const row of rows) {
          await t.delete(row.id)
          await t.put(remapOwner(table, row as unknown as Record<string, unknown>, newUserId) as never)
        }
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
