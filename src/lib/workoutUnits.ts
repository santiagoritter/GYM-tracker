import type { Exercise, RoutineExercise, WorkoutSet } from '@/types'

export interface GroupedExercise {
  exercise: Exercise | undefined
  sets: WorkoutSet[]
}

/**
 * Orden de los ejercicios de un entreno: el de la rutina, no el que salga por
 * casualidad.
 *
 * Antes la pantalla agrupaba las series ordenadas por `setNumber` y tomaba el
 * orden de "primera aparición": todas las series nº 1 primero, y entre ellas el
 * orden del índice de Dexie, que a igualdad es la clave primaria — el UUID
 * aleatorio de la serie. Los ejercicios salían en un orden al azar (estable, pero
 * sin relación con la rutina), los pares en superserie se separaban y lo mismo
 * pasaba en el historial.
 *
 * Criterio, por ejercicio:
 *  1. `exerciseOrder` guardado en sus series (entrenos nuevos);
 *  2. si no tiene (entrenos anteriores), su posición en la rutina del día;
 *  3. si tampoco (agregado a mano), al final, en el orden en que se agregó.
 * El empate se resuelve por orden de aparición, nunca por UUID.
 */
export function orderExerciseGroups(
  sets: readonly WorkoutSet[],
  dayEntries: readonly Pick<RoutineExercise, 'id' | 'exerciseId' | 'exerciseOrder'>[] = []
): { exerciseId: string; sets: WorkoutSet[] }[] {
  // Copia: `sets` suele venir de `useLiveQuery` y ordenarlo in situ lo mutaba.
  const sorted = [...sets].sort((a, b) => a.setNumber - b.setNumber || a.id.localeCompare(b.id))

  const groups = new Map<string, WorkoutSet[]>()
  for (const s of sorted) {
    const list = groups.get(s.exerciseId)
    if (list) list.push(s)
    else groups.set(s.exerciseId, [s])
  }

  const routinePosition = new Map<string, number>()
  ;[...dayEntries]
    .sort((a, b) => a.exerciseOrder - b.exerciseOrder || a.id.localeCompare(b.id))
    .forEach((e, i) => {
      if (!routinePosition.has(e.exerciseId)) routinePosition.set(e.exerciseId, i + 1)
    })

  const rank = (exerciseId: string, list: WorkoutSet[]): number => {
    const saved = list.map((s) => s.exerciseOrder).filter((n): n is number => typeof n === 'number')
    if (saved.length > 0) return Math.min(...saved)
    return routinePosition.get(exerciseId) ?? Number.POSITIVE_INFINITY
  }

  return [...groups.entries()]
    .map(([exerciseId, list], appearance) => ({ exerciseId, sets: list, appearance, rank: rank(exerciseId, list) }))
    .sort((a, b) => (a.rank === b.rank ? a.appearance - b.appearance : a.rank < b.rank ? -1 : 1))
    .map(({ exerciseId, sets: list }) => ({ exerciseId, sets: list }))
}

/** `exerciseOrder` para un ejercicio nuevo: después de todos los que ya hay (los
 * entrenos anteriores a esta columna no lo traen: se cuentan por cantidad). */
export function nextExerciseOrder(existing: readonly Pick<WorkoutSet, 'exerciseId' | 'exerciseOrder'>[]): number {
  const distinct = new Set(existing.map((s) => s.exerciseId)).size
  const maxSaved = existing.reduce((m, s) => Math.max(m, s.exerciseOrder ?? 0), 0)
  return Math.max(distinct, maxSaved) + 1
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
