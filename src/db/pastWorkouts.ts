import { db } from '@/db/schema'
import type { PersonalRecord, Workout, WorkoutSet } from '@/types'
import { nowIso, uid } from '@/lib/utils'
import { computeVolumeKg, previewPRs } from '@/lib/workoutSummary'

export interface PastWorkoutExerciseInput {
  exerciseId: string
  sets: { reps: number; weightKg: number }[]
}

/**
 * Registra un entreno que ya sucedió, con fecha elegida por el usuario, en
 * vez de uno que arranca "ahora" (startWorkoutFromDay). `finishedAt` queda
 * SIEMPRE seteado — cualquier Workout sin finishedAt se trata en toda la
 * app como "el entreno en curso" (workoutsFor(userId).filter(w =>
 * !w.finishedAt), usado en Layout.tsx y Routines.tsx) y secuestraría esa
 * UI. Todas las series se guardan `completed: 1`: es un registro de lo
 * que pasó, no una sesión en progreso.
 */
export async function logPastWorkout(
  userId: string,
  name: string,
  dateIso: string,
  exercises: PastWorkoutExerciseInput[]
): Promise<{ workoutId: string; newPRs: PersonalRecord[] }> {
  const workout: Workout = {
    id: uid(),
    userId,
    name,
    startedAt: dateIso,
    finishedAt: dateIso,
    dirty: 1,
    updatedAt: nowIso(),
  }

  const sets: WorkoutSet[] = []
  for (const ex of exercises) {
    ex.sets.forEach((s, i) => {
      sets.push({
        id: uid(),
        workoutId: workout.id,
        userId,
        exerciseId: ex.exerciseId,
        setNumber: i + 1,
        reps: s.reps,
        weightKg: s.weightKg,
        isWarmup: 0,
        completed: 1,
        dirty: 1,
        updatedAt: nowIso(),
      })
    })
  }
  workout.totalVolumeKg = computeVolumeKg(sets)

  await db.transaction('rw', [db.workouts, db.workoutSets], async () => {
    await db.workouts.add(workout)
    await db.workoutSets.bulkAdd(sets)
  })

  // PRs con el mismo criterio que finishWorkout, pero `achievedAt` es la
  // fecha elegida, no "ahora" — decir que un PR de hace tres meses se
  // logró hoy sería falso. Si se carga fuera de orden cronológico, un PR
  // ya guardado más reciente puede terminar con un achievedAt posterior a
  // uno cargado después: aceptado a propósito, no se resuelve con
  // reordenamiento acá (ver Fase 3 del roadmap).
  const candidates = await previewPRs(userId, sets)
  const newPRs: PersonalRecord[] = []
  for (const c of candidates) {
    const pr: PersonalRecord = {
      id: `${userId}_${c.exerciseId}`,
      userId,
      exerciseId: c.exerciseId,
      weightKg: c.weightKg,
      reps: c.reps,
      oneRmKg: c.oneRmKg,
      achievedAt: dateIso,
      workoutId: workout.id,
      dirty: 1,
      updatedAt: nowIso(),
    }
    await db.personalRecords.put(pr)
    newPRs.push(pr)
  }

  return { workoutId: workout.id, newPRs }
}
