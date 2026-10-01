import { bestEpley1RM } from '@/lib/recommendation'
import type { Exercise, WorkoutSet } from '@/types'

/**
 * Lógica pura de la card "Noticias" de Inicio (ver components/gym/NewsCard).
 * Sin Dexie ni red, para poder probarla en scripts/test-news.mts.
 */

/** Fila de la RPC `popular_exercise_weights()` (migración 0026). */
export interface PopularWeightRow {
  exerciseId: string
  users: number
  weightKg: number
}

export interface PopularWeight extends PopularWeightRow {
  name: string
}

/** Pesos de la comunidad con nombre, de mayor a menor peso. Se descartan los
 * ejercicios que no están en el catálogo local (personalizados de otros). */
export function rankPopularWeights(
  rows: PopularWeightRow[],
  exercises: Map<string, Pick<Exercise, 'name'>>
): PopularWeight[] {
  const out: PopularWeight[] = []
  for (const r of rows) {
    const e = exercises.get(r.exerciseId)
    if (e && r.weightKg > 0) out.push({ ...r, name: e.name })
  }
  return out.sort((a, b) => b.weightKg - a.weightKg || b.users - a.users)
}

export interface PrImprovement {
  exerciseId: string
  name: string
  beforeKg: number
  nowKg: number
  deltaKg: number
  /** 0.12 = 12 % */
  pct: number
}

export const PR_WINDOW_DAYS = 30

/**
 * PRs que más subieron: 1RM estimado (Epley, mismo cálculo que el
 * recomendador) con todo el historial contra el que tenías hace
 * `PR_WINDOW_DAYS` días. Solo ejercicios con marca previa: un ejercicio nuevo
 * no "subió", empezó. La fecha de cada serie es la del entreno, no su
 * `updatedAt` (editar una serie vieja no la vuelve nueva).
 */
export function topPrImprovements(
  sets: WorkoutSet[],
  workoutStartedAt: Map<string, string>,
  exercises: Map<string, Pick<Exercise, 'name'>>,
  now = Date.now(),
  limit = 3
): PrImprovement[] {
  const cutoff = now - PR_WINDOW_DAYS * 86_400_000
  const byExercise = new Map<string, { all: WorkoutSet[]; before: WorkoutSet[] }>()
  for (const s of sets) {
    const at = Date.parse(workoutStartedAt.get(s.workoutId) ?? s.updatedAt)
    const bucket = byExercise.get(s.exerciseId) ?? { all: [], before: [] }
    bucket.all.push(s)
    if (at < cutoff) bucket.before.push(s)
    byExercise.set(s.exerciseId, bucket)
  }
  const out: PrImprovement[] = []
  for (const [exerciseId, { all, before }] of byExercise) {
    const e = exercises.get(exerciseId)
    if (!e) continue
    const beforeKg = bestEpley1RM(before)
    const nowKg = bestEpley1RM(all)
    if (beforeKg <= 0 || nowKg <= beforeKg) continue
    out.push({ exerciseId, name: e.name, beforeKg, nowKg, deltaKg: nowKg - beforeKg, pct: (nowKg - beforeKg) / beforeKg })
  }
  return out.sort((a, b) => b.pct - a.pct).slice(0, limit)
}
