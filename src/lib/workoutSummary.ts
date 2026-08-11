import type { PersonalRecord, WorkoutSet } from '@/types'
import { db } from '@/db/schema'
import { calc1RM } from '@/lib/utils'

/**
 * Única fuente de verdad de "qué serie cuenta" para volumen y PRs: series
 * completadas, sin calentamiento. Antes vivía duplicado inline en
 * `finishWorkout` — acá se comparte con la vista previa (Workout.tsx) para
 * que preview y guardado real no puedan divergir con el tiempo.
 */
export function workingSetsOf(sets: WorkoutSet[]): WorkoutSet[] {
  return sets.filter((s) => s.completed === 1 && s.isWarmup === 0)
}

export function computeVolumeKg(sets: WorkoutSet[]): number {
  return workingSetsOf(sets).reduce((sum, s) => sum + s.weightKg * s.reps, 0)
}

export function computeDurationSec(startedAt: string, nowMs = Date.now()): number {
  return Math.max(0, Math.floor((nowMs - new Date(startedAt).getTime()) / 1000))
}

/** Mejor set por ejercicio (mayor 1RM estimado), entre los que cuentan. */
export function bestSetPerExercise(sets: WorkoutSet[]): Map<string, WorkoutSet> {
  const best = new Map<string, WorkoutSet>()
  for (const s of workingSetsOf(sets)) {
    const current = best.get(s.exerciseId)
    if (!current || calc1RM(s.weightKg, s.reps) > calc1RM(current.weightKg, current.reps)) {
      best.set(s.exerciseId, s)
    }
  }
  return best
}

export interface PRPreviewItem {
  exerciseId: string
  weightKg: number
  reps: number
  oneRmKg: number
  previousOneRmKg?: number // undefined = primer PR de ese ejercicio
}

/**
 * Compara el mejor set de cada ejercicio contra `personalRecords`, sin
 * escribir nada — la usan tanto la vista previa (antes de guardar) como
 * `finishWorkout` (al confirmar, con una lectura fresca de Dexie).
 */
export async function previewPRs(userId: string, sets: WorkoutSet[]): Promise<PRPreviewItem[]> {
  const items: PRPreviewItem[] = []
  for (const [exerciseId, best] of bestSetPerExercise(sets)) {
    const oneRm = calc1RM(best.weightKg, best.reps)
    if (oneRm <= 0) continue
    const current: PersonalRecord | undefined = await db.personalRecords.get(
      `${userId}_${exerciseId}`
    )
    if (!current || oneRm > current.oneRmKg) {
      items.push({
        exerciseId,
        weightKg: best.weightKg,
        reps: best.reps,
        oneRmKg: oneRm,
        previousOneRmKg: current?.oneRmKg,
      })
    }
  }
  return items
}
