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
