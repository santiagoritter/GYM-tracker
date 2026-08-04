import { db } from '@/db/schema'
import { getSyncUser } from '@/db/syncHooks'
import type { SyncedTable, Tombstone } from '@/types'
import { nowIso } from '@/lib/utils'

/**
 * Borra una fila dejando una lápida para que el borrado se pueda propagar.
 *
 * Sin esto el borrado sería invisible para el resto de los dispositivos: el
 * pull incremental pregunta "¿qué filas cambiaron después del cursor?" y una
 * fila borrada físicamente en el servidor no aparece en ninguna respuesta.
 *
 * No se puede resolver con un hook `deleting` porque la lápida va en OTRA
 * tabla y la transacción implícita que abre `db.routines.delete(id)` solo
 * tiene `routines` en scope — escribir en `tombstones` desde ahí tira
 * NotFoundError. Por eso el helper controla la transacción.
 */
export async function softDelete(tableName: SyncedTable, id: string): Promise<void> {
  await db.transaction('rw', [db.table(tableName), db.tombstones], async () => {
    const row = (await db.table(tableName).get(id)) as
      | { userId?: string; storagePath?: string }
      | undefined
    if (!row) return

    const userId = row.userId ?? getSyncUser()
    if (userId) {
      const tombstone: Tombstone = {
        id,
        tableName,
        userId,
        storagePath: row.storagePath,
        deletedAt: nowIso(),
        dirty: 1,
      }
      await db.tombstones.put(tombstone)
    }
    await db.table(tableName).delete(id)
  })
}

/** Igual que `softDelete` pero para varias filas de la misma tabla. */
export async function softDeleteMany(tableName: SyncedTable, ids: string[]): Promise<void> {
  if (ids.length === 0) return
  await db.transaction('rw', [db.table(tableName), db.tombstones], async () => {
    const rows = (await db.table(tableName).bulkGet(ids)) as (
      | { id: string; userId?: string; storagePath?: string }
      | undefined
    )[]
    const tombstones: Tombstone[] = []
    const present: string[] = []
    const deletedAt = nowIso()

    for (const row of rows) {
      if (!row) continue
      present.push(row.id)
      const userId = row.userId ?? getSyncUser()
      if (!userId) continue
      tombstones.push({
        id: row.id,
        tableName,
        userId,
        storagePath: row.storagePath,
        deletedAt,
        dirty: 1,
      })
    }

    if (tombstones.length > 0) await db.tombstones.bulkPut(tombstones)
    if (present.length > 0) await db.table(tableName).bulkDelete(present)
  })
}

/**
 * Limpia la lápida de un id que vuelve a existir. Caso real: reimportar por
 * QR una rutina cuyo id ya se había borrado — sin esto, el push mandaría el
 * alta y después el borrado, y la rutina desaparecería sola.
 */
export async function clearTombstone(id: string): Promise<void> {
  await db.tombstones.delete(id)
}
