import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/schema'
import { workoutsFor } from '@/db/scoped'

/** Últimos ejercicios distintos entrenados por este usuario, más reciente
 * primero. Extraído de ExercisePicker.tsx (donde vivía inline) para que
 * Exercises.tsx pueda mostrar la misma sección "Recientes" sin duplicar
 * la consulta. */
export function useRecentExerciseIds(userId: string | null | undefined): string[] {
  return (
    useLiveQuery(async () => {
      if (!userId) return []
      const ownWorkoutIds = new Set((await workoutsFor(userId).toArray()).map((w) => w.id))
      const allSets = await db.workoutSets.toArray()
      const ordered = allSets
        .filter((s) => ownWorkoutIds.has(s.workoutId))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      const seen = new Set<string>()
      const ids: string[] = []
      for (const s of ordered) {
        if (seen.has(s.exerciseId)) continue
        seen.add(s.exerciseId)
        ids.push(s.exerciseId)
        if (ids.length >= 6) break
      }
      return ids
    }, [userId]) ?? []
  )
}
