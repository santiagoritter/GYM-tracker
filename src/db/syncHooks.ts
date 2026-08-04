import type { GymTrackerDB } from '@/db/schema'
import { SYNC_ORDER } from '@/db/schema'
import { nowIso } from '@/lib/utils'

/**
 * Usuario activo, para poder completar `userId` en las filas que se crean
 * sin él (típicamente las tablas hijas: routineDays, workoutSets…).
 *
 * Es un módulo mutable en vez de una lectura del store de zustand porque
 * los hooks de Dexie son SÍNCRONOS: no se puede await nada adentro.
 */
let activeUserId: string | null = null

export function setSyncUser(userId: string | null): void {
  activeUserId = userId
}

export function getSyncUser(): string | null {
  return activeUserId
}

/**
 * Sella `updatedAt` y `dirty` en cada escritura a las tablas sincronizadas.
 *
 * El motivo de hacerlo con hooks y no en los call sites: hay ~35 puntos de
 * escritura repartidos por páginas, stores y helpers, y el flag `synced` que
 * existía antes demostró que ese enfoque no escala — la mitad de los call
 * sites no lo escribían (`setActiveRoutine`, los `update` de RoutineEditor,
 * las altas de medidas y fotos), así que esas escrituras nunca se habrían
 * subido. Con hooks es imposible olvidarse.
 *
 * Cubre add/put/update/bulkAdd/bulkPut y `.modify()`, que es todo lo que
 * usa la app. Los deletes NO se cubren acá: necesitan escribir en otra tabla
 * (tombstones) y la transacción implícita de Dexie no la tiene en scope —
 * para eso está `softDelete` en `src/db/mutations.ts`.
 */
export function installSyncHooks(db: GymTrackerDB): void {
  for (const name of SYNC_ORDER) {
    const table = db.table(name)

    table.hook('creating', (_pk, obj) => {
      const row = obj as Record<string, unknown>
      // Escape para el pull: las filas que bajan del servidor ya vienen
      // limpias y volver a ensuciarlas las re-subiría en un loop.
      if (row.dirty === 0) return
      row.updatedAt ??= nowIso()
      row.dirty = 1
      // `profile` usa el userId como PK, así que no lleva columna aparte.
      if (name !== 'profile' && !row.userId && activeUserId) {
        row.userId = activeUserId
      }
    })

    table.hook('updating', (mods) => {
      const patch = mods as Record<string, unknown>
      // Mismo escape: es el pusher bajando el flag tras subir la fila.
      // Sin esto se genera un loop infinito (limpia → hook ensucia → sube).
      if ('dirty' in patch && patch.dirty === 0) return
      return { ...patch, updatedAt: nowIso(), dirty: 1 }
    })
  }
}
