import type { RoutineExercise } from '@/types'

/**
 * Reglas puras sobre las filas de ejercicios de un día de rutina, para que todas
 * las pantallas y el arranque del entreno coincidan en qué se muestra y en qué
 * orden. Antes cada una filtraba y ordenaba a su manera: un ejercicio que no está
 * en el catálogo se dibujaba como una tarjeta "Ejercicio" vacía, y los empates de
 * `exerciseOrder` (dos dispositivos que agregan antes de sincronizar) se
 * resolvían por UUID.
 */

type OrderedEntry = Pick<RoutineExercise, 'id' | 'exerciseOrder'>

/** Orden de la rutina; el empate se desempata por id (estable entre dispositivos). */
export function compareRoutineEntries(a: OrderedEntry, b: OrderedEntry): number {
  return a.exerciseOrder - b.exerciseOrder || a.id.localeCompare(b.id)
}

/**
 * ¿La fila apunta a un ejercicio que se puede entrenar? Con el catálogo todavía
 * vacío (primer arranque a medias) no se puede afirmar nada: se acepta todo lo que
 * tenga id.
 */
export function isKnownEntry(
  entry: Pick<RoutineExercise, 'exerciseId'>,
  catalogIds: ReadonlySet<string>
): boolean {
  if (!entry.exerciseId || !entry.exerciseId.trim()) return false
  return catalogIds.size === 0 || catalogIds.has(entry.exerciseId)
}

/** Las filas que se muestran y se entrenan, en orden. */
export function visibleEntries<T extends Pick<RoutineExercise, 'id' | 'exerciseId' | 'exerciseOrder'>>(
  rows: readonly T[],
  catalogIds: ReadonlySet<string>
): T[] {
  return rows.filter((r) => isKnownEntry(r, catalogIds)).sort(compareRoutineEntries)
}

export interface DayCandidate {
  dayId: string
  /** ¿Es un día de la rutina favorita? Desempata cuando dos rutinas tienen un día con el mismo nombre. */
  routineIsActive: boolean
  exerciseIds: readonly string[]
}

/**
 * Qué día de rutina originó un entreno. El entreno no guarda el `dayId` (solo el
 * nombre del día), y dos rutinas pueden tener un "Día 1": se elige el que más
 * ejercicios comparte con las series del entreno y, ante un empate, el de la rutina
 * favorita. Antes se buscaba solo entre los días de la rutina favorita, así que un
 * entreno de otra rutina perdía su orden y sus descansos.
 */
export function pickBestDay(
  candidates: readonly DayCandidate[],
  workoutExerciseIds: ReadonlySet<string>
): DayCandidate | undefined {
  let best: { c: DayCandidate; overlap: number } | undefined
  for (const c of candidates) {
    const overlap = c.exerciseIds.filter((id) => workoutExerciseIds.has(id)).length
    if (
      !best ||
      overlap > best.overlap ||
      (overlap === best.overlap && c.routineIsActive && !best.c.routineIsActive)
    ) {
      best = { c, overlap }
    }
  }
  return best?.c
}
