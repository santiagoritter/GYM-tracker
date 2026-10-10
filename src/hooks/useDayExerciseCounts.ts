import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/schema'
import { routineExercisesForUser } from '@/db/scoped'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { visibleEntries } from '@/lib/routineEntries'

/**
 * Cuántos ejercicios entrenables tiene cada día (por `dayId`), con la misma regla
 * que el arranque del entreno (`visibleEntries`). `undefined` mientras carga: la
 * pantalla no tiene que mostrar "sin ejercicios" por un instante.
 */
export function useDayExerciseCounts(): Map<string, number> | undefined {
  const userId = useCurrentUserId()
  return useLiveQuery(async () => {
    if (!userId) return new Map<string, number>()
    const [rows, catalogIds] = await Promise.all([
      routineExercisesForUser(userId).toArray(),
      db.exercises.toCollection().primaryKeys(),
    ])
    const counts = new Map<string, number>()
    for (const r of visibleEntries(rows, new Set(catalogIds))) counts.set(r.dayId, (counts.get(r.dayId) ?? 0) + 1)
    return counts
  }, [userId])
}
