import type { Workout, WorkoutSet } from '@/types'

/**
 * Entreno "fantasma" (reportado por un tester): si se sale de la app sin
 * terminar el entreno, al volver seguía "en curso" y el contador marcaba
 * `ahora - startedAt` — 5 horas o más. Nada lo reconciliaba.
 *
 * Criterio: pasadas STALE_AFTER_MS sin actividad real, el entreno queda
 * vencido y la app pregunta qué hacer en vez de seguir contando. Actividad =
 * la escritura más reciente de cualquier serie del entreno, o del entreno
 * mismo (`updatedAt`, que el hook de sync sella en cada cambio).
 *
 * Solo fuerza: correr y cardio tienen su propio tracking (GPS, tiempo
 * explícito) y una salida larga puede durar más de 3 h de verdad.
 */
export const STALE_AFTER_MS = 3 * 60 * 60 * 1000

export function lastActivityAt(
  workout: Pick<Workout, 'startedAt' | 'updatedAt'>,
  sets: Pick<WorkoutSet, 'updatedAt'>[],
  keptAt?: string | null
): string {
  let last = workout.startedAt
  if (keptAt && keptAt > last) last = keptAt
  if (workout.updatedAt && workout.updatedAt > last) last = workout.updatedAt
  for (const s of sets) if (s.updatedAt && s.updatedAt > last) last = s.updatedAt
  return last
}

export function isStaleWorkout(
  workout: Pick<Workout, 'startedAt' | 'updatedAt' | 'finishedAt' | 'kind'>,
  sets: Pick<WorkoutSet, 'updatedAt'>[],
  now = Date.now(),
  keptAt?: string | null
): boolean {
  if (workout.finishedAt) return false
  if (workout.kind && workout.kind !== 'strength') return false
  return now - new Date(lastActivityAt(workout, sets, keptAt)).getTime() > STALE_AFTER_MS
}

/** "Seguir" en la hoja de entreno vencido: se guarda en este dispositivo y
 * cuenta como actividad. No se escribe en el entreno (updatedAt lo sellan
 * los hooks de sync, no se toca a mano). */
const KEPT_PREFIX = 'repe-workout-kept:'

export function getKeptAt(workoutId: string): string | null {
  try {
    return localStorage.getItem(KEPT_PREFIX + workoutId)
  } catch {
    return null
  }
}

export function markKept(workoutId: string, now = new Date()): void {
  try {
    localStorage.setItem(KEPT_PREFIX + workoutId, now.toISOString())
  } catch {
    // Sin storage (modo privado): la hoja vuelve a aparecer, no rompe nada.
  }
}

/** "Hace 5 h", "hace 1 día" — para decir cuánto lleva sin actividad. */
export function inactiveLabel(lastActivityIso: string, now = Date.now()): string {
  const hours = Math.floor((now - new Date(lastActivityIso).getTime()) / (60 * 60 * 1000))
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  return days === 1 ? 'hace 1 día' : `hace ${days} días`
}
