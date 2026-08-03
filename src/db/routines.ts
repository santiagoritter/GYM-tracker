import { db } from '@/db/schema'
import { workoutsFor } from '@/db/scoped'
import type { Routine, RoutineDay, RoutineExercise, Workout, WorkoutSet } from '@/types'
import { nowIso, uid } from '@/lib/utils'

export const ROUTINE_COLORS = ['#E8FF47', '#60A5FA', '#F97316', '#EC4899', '#4ADE80', '#A855F7']

export async function createRoutine(userId: string, name: string): Promise<string> {
  const routine: Routine = {
    id: uid(),
    userId,
    name,
    color: ROUTINE_COLORS[0],
    isActive: 0,
    isArchived: 0,
    synced: 0,
    updatedAt: nowIso(),
  }
  await db.routines.add(routine)
  // Arranca con un día para que el editor no quede vacío
  await addDay(routine.id, 'Día 1')
  return routine.id
}

export async function updateRoutine(id: string, patch: Partial<Routine>): Promise<void> {
  await db.routines.update(id, { ...patch, updatedAt: nowIso(), synced: 0 })
}

/** Solo una rutina activa a la vez (por usuario). */
export async function setActiveRoutine(userId: string, id: string): Promise<void> {
  await db.transaction('rw', db.routines, async () => {
    await db.routines.where('userId').equals(userId).modify({ isActive: 0 })
    await db.routines.update(id, { isActive: 1, updatedAt: nowIso() })
  })
}

export async function deleteRoutine(id: string): Promise<void> {
  const days = await db.routineDays.where('routineId').equals(id).toArray()
  await db.transaction('rw', [db.routines, db.routineDays, db.routineExercises], async () => {
    for (const day of days) {
      await db.routineExercises.where('dayId').equals(day.id).delete()
    }
    await db.routineDays.where('routineId').equals(id).delete()
    await db.routines.delete(id)
  })
}

export async function addDay(routineId: string, name: string): Promise<string> {
  const existing = await db.routineDays.where('routineId').equals(routineId).toArray()
  const day: RoutineDay = {
    id: uid(),
    routineId,
    name,
    dayOrder: existing.length + 1,
    isRest: 0,
  }
  await db.routineDays.add(day)
  return day.id
}

export async function deleteDay(dayId: string): Promise<void> {
  await db.transaction('rw', [db.routineDays, db.routineExercises], async () => {
    await db.routineExercises.where('dayId').equals(dayId).delete()
    await db.routineDays.delete(dayId)
  })
}

export async function addExerciseToDay(dayId: string, exerciseId: string): Promise<void> {
  const existing = await db.routineExercises.where('dayId').equals(dayId).toArray()
  const entry: RoutineExercise = {
    id: uid(),
    dayId,
    exerciseId,
    exerciseOrder: existing.length + 1,
    setsTarget: 3,
    repsMin: 8,
    repsMax: 12,
    restSeconds: 90,
  }
  await db.routineExercises.add(entry)
}

/**
 * Enlaza/desenlaza un ejercicio en superset con el anterior del día.
 * Grupos con un solo miembro se limpian automáticamente.
 */
export async function toggleSupersetWithPrevious(entryId: string): Promise<void> {
  const entry = await db.routineExercises.get(entryId)
  if (!entry) return
  const siblings = (await db.routineExercises.where('dayId').equals(entry.dayId).toArray()).sort(
    (a, b) => a.exerciseOrder - b.exerciseOrder
  )
  const index = siblings.findIndex((s) => s.id === entryId)
  if (index <= 0) return
  const prev = siblings[index - 1]

  await db.transaction('rw', db.routineExercises, async () => {
    if (entry.supersetGroup !== undefined && entry.supersetGroup === prev.supersetGroup) {
      // Desenlazar
      await db.routineExercises.update(entry.id, { supersetGroup: undefined })
      const remaining = siblings.filter(
        (s) => s.id !== entry.id && s.supersetGroup === prev.supersetGroup
      )
      if (remaining.length === 1) {
        await db.routineExercises.update(remaining[0].id, { supersetGroup: undefined })
      }
    } else {
      // Enlazar: usa el grupo del anterior o crea uno nuevo
      const group =
        prev.supersetGroup ??
        Math.max(0, ...siblings.map((s) => s.supersetGroup ?? 0)) + 1
      await db.routineExercises.update(prev.id, { supersetGroup: group })
      await db.routineExercises.update(entry.id, { supersetGroup: group })
    }
  })
}

/** Mueve un ejercicio una posición arriba o abajo dentro del día. */
export async function moveExercise(entryId: string, direction: -1 | 1): Promise<void> {
  const entry = await db.routineExercises.get(entryId)
  if (!entry) return
  const siblings = (await db.routineExercises.where('dayId').equals(entry.dayId).toArray()).sort(
    (a, b) => a.exerciseOrder - b.exerciseOrder
  )
  const index = siblings.findIndex((s) => s.id === entryId)
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= siblings.length) return
  const other = siblings[targetIndex]
  await db.transaction('rw', db.routineExercises, async () => {
    await db.routineExercises.update(entry.id, { exerciseOrder: other.exerciseOrder })
    await db.routineExercises.update(other.id, { exerciseOrder: entry.exerciseOrder })
  })
}

/**
 * Crea un workout precargado con los ejercicios del día de rutina.
 * Cada ejercicio arranca con sus series objetivo en repsMin, peso 0
 * (el usuario ajusta; en Fase 5 se autocompleta con el último peso usado).
 */
export async function startWorkoutFromDay(userId: string, dayId: string): Promise<string> {
  const day = await db.routineDays.get(dayId)
  if (!day) throw new Error('Día de rutina no encontrado')
  const entries = (await db.routineExercises.where('dayId').equals(dayId).toArray()).sort(
    (a, b) => a.exerciseOrder - b.exerciseOrder
  )

  const workout: Workout = {
    id: uid(),
    userId,
    name: day.name,
    startedAt: nowIso(),
    synced: 0,
    updatedAt: nowIso(),
  }

  // Solo entrenos propios: workoutSets no tiene userId directo, así que se
  // filtra por los workoutId que ya sabemos que son del usuario actual.
  const ownWorkoutIds = new Set((await workoutsFor(userId).toArray()).map((w) => w.id))

  // Autocompletar peso desde el historial + progresión automática:
  // si la última vez se completaron todas las series objetivo llegando al
  // máximo de reps, se sugiere +2.5kg.
  const sets: WorkoutSet[] = []
  for (const entry of entries) {
    const history = await db.workoutSets
      .where('exerciseId')
      .equals(entry.exerciseId)
      .filter((s) => s.completed === 1 && s.isWarmup === 0 && ownWorkoutIds.has(s.workoutId))
      .toArray()

    let suggestedKg = 0
    if (history.length > 0) {
      // Series del entreno más reciente donde se hizo este ejercicio
      const lastWorkoutId = history.sort((a, b) =>
        a.updatedAt.localeCompare(b.updatedAt)
      ).at(-1)!.workoutId
      const lastSets = history.filter((s) => s.workoutId === lastWorkoutId)
      const topWeight = Math.max(...lastSets.map((s) => s.weightKg))
      const metTarget =
        lastSets.length >= entry.setsTarget &&
        lastSets.every((s) => s.reps >= entry.repsMax)
      suggestedKg = metTarget && topWeight > 0 ? topWeight + 2.5 : topWeight
    }

    for (let n = 1; n <= entry.setsTarget; n++) {
      sets.push({
        id: uid(),
        workoutId: workout.id,
        exerciseId: entry.exerciseId,
        setNumber: n,
        reps: entry.repsMin,
        weightKg: suggestedKg,
        isWarmup: 0,
        completed: 0,
        synced: 0,
        updatedAt: nowIso(),
        supersetGroup: entry.supersetGroup,
      })
    }
  }

  await db.transaction('rw', [db.workouts, db.workoutSets], async () => {
    await db.workouts.add(workout)
    await db.workoutSets.bulkAdd(sets)
  })
  return workout.id
}
