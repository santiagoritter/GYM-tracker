import type { Exercise, WorkoutSet } from '@/types'

export interface GroupedExercise {
  exercise: Exercise | undefined
  sets: WorkoutSet[]
}

export interface ExerciseUnit {
  key: string // exerciseId suelto, o `ss-${supersetGroup}` para un par
  members: GroupedExercise[]
  supersetGroup?: number
}

/**
 * Agrupa `grouped` (ejercicio -> sets, ya en orden de aparición) en
 * unidades de colapso: un ejercicio suelto, o un par en superserie que se
 * expande/colapsa junto. Los pares de superserie quedan adyacentes en
 * `grouped` porque vienen de entradas de rutina consecutivas — alcanza con
 * un escaneo lineal, sin reordenar nada.
 *
 * Motivo de agrupar el par: en superserie no hay descanso hasta cerrar la
 * vuelta (ver `handleCompleteSet` en Workout.tsx) — si "activo" fuera por
 * ejercicio suelto, completar el set de A colapsaría su card justo cuando
 * hay que saltar a B sin fricción.
 */
export function groupExerciseUnits(grouped: GroupedExercise[]): ExerciseUnit[] {
  const units: ExerciseUnit[] = []
  let i = 0
  while (i < grouped.length) {
    const current = grouped[i]
    const group = current.sets[0]?.supersetGroup
    const partner = grouped[i + 1]
    if (group !== undefined && partner?.sets[0]?.supersetGroup === group) {
      units.push({ key: `ss-${group}`, members: [current, partner], supersetGroup: group })
      i += 2
      continue
    }
    units.push({ key: current.exercise?.id ?? 'unknown', members: [current] })
    i += 1
  }
  return units
}

/** Primera unidad con alguna serie sin completar; si todo está completo, la
 * primera unidad. Mismo criterio que ya usa `editingSetId` a nivel de serie. */
export function defaultActiveUnitKey(units: ExerciseUnit[]): string | null {
  const withIncomplete = units.find((u) =>
    u.members.some((m) => m.sets.some((s) => s.completed === 0))
  )
  return (withIncomplete ?? units[0])?.key ?? null
}

/** A qué unidad pertenece un `exerciseId` suelto — usado para "pinnear" la
 * unidad activa al completar una serie de un ejercicio en particular. */
export function unitKeyForExercise(
  units: ExerciseUnit[],
  exerciseId: string
): string | undefined {
  return units.find((u) => u.members.some((m) => m.exercise?.id === exerciseId))?.key
}
