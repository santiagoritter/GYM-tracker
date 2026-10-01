import { recommend, type Recommendation } from '@/lib/recommendation'
import { suggestRestSeconds, type RestSuggestion } from '@/lib/restRecommendation'
import type { Exercise, LocalProfile, RestLog, RoutineExercise, WorkoutSet } from '@/types'

/**
 * Sugerencias de peso para mostrar en Progreso, con la MISMA regla que la
 * notificación "Nuevo peso recomendado" (workoutStore.addExercise): solo
 * cuando lo que sugiere el recomendador supera tu mejor marca en ese
 * ejercicio. Antes el dato solo existía como notificación; ahora también
 * vive en la pantalla donde se mira el progreso.
 */
export interface WeightSuggestion {
  exerciseId: string
  name: string
  weightKg: number
  prevBestKg: number
  rec: Recommendation
}

/** Recomendación para un ejercicio con tu historial (series completas, sin
 * calentamiento). `null` si no hay historial propio: sin marca previa no hay
 * "aumento" que sugerir. */
export function suggestionFor(
  exercise: Exercise,
  profile: LocalProfile | undefined,
  allSets: WorkoutSet[]
): WeightSuggestion | null {
  const valid = allSets.filter((s) => s.completed === 1 && s.isWarmup === 0)
  const history = valid.filter((s) => s.exerciseId === exercise.id)
  if (history.length === 0) return null
  const other = valid.filter((s) => s.exerciseId !== exercise.id)
  const rec = recommend(exercise, profile, history, other)
  const prevBestKg = Math.max(...history.map((s) => s.weightKg))
  return { exerciseId: exercise.id, name: exercise.name, weightKg: rec.weightKg, prevBestKg, rec }
}

/**
 * Peso sugerido para los ejercicios entrenados, los que suben primero y
 * después los más recientes. `isIncrease` marca los que superan tu mejor
 * marca (la misma condición que dispara la notificación). Con el objetivo
 * "general" el recomendador rara vez sube por encima de la mejor marca, así
 * que una lista de solo aumentos quedaba casi siempre vacía.
 */
export function weightSuggestions(
  exercises: Exercise[],
  profile: LocalProfile | undefined,
  allSets: WorkoutSet[]
): (WeightSuggestion & { isIncrease: boolean; lastAt: string })[] {
  const lastAt = new Map<string, string>()
  for (const s of allSets) {
    if (s.completed !== 1 || s.isWarmup !== 0) continue
    const prev = lastAt.get(s.exerciseId)
    if (!prev || (s.updatedAt ?? '') > prev) lastAt.set(s.exerciseId, s.updatedAt ?? '')
  }
  const out: (WeightSuggestion & { isIncrease: boolean; lastAt: string })[] = []
  for (const e of exercises) {
    if (!lastAt.has(e.id)) continue
    const s = suggestionFor(e, profile, allSets)
    if (s && s.weightKg > 0) out.push({ ...s, isIncrease: s.weightKg > s.prevBestKg, lastAt: lastAt.get(e.id)! })
  }
  return out.sort((a, b) => Number(b.isIncrease) - Number(a.isIncrease) || b.lastAt.localeCompare(a.lastAt))
}

export interface RestSuggestionRow {
  exerciseId: string
  suggestion: RestSuggestion
  /** Filas de rutina que se actualizarían (puede estar en varios días). */
  routineEntryIds: string[]
}

/**
 * Descansos sugeridos para TODOS los ejercicios con descansos registrados,
 * con la misma función que la notificación (`suggestRestSeconds`). El
 * descanso "actual" de cada ejercicio es el de su primera fila de rutina, o
 * el default del perfil si no está en ninguna.
 */
export function restSuggestions(
  logs: RestLog[],
  routineEntries: Pick<RoutineExercise, 'id' | 'exerciseId' | 'restSeconds'>[],
  defaultRest: number,
  now = Date.now()
): RestSuggestionRow[] {
  const byExercise = new Map<string, RestLog[]>()
  for (const l of logs) {
    const list = byExercise.get(l.exerciseId) ?? []
    list.push(l)
    byExercise.set(l.exerciseId, list)
  }
  const out: RestSuggestionRow[] = []
  for (const [exerciseId, exLogs] of byExercise) {
    const entries = routineEntries.filter((e) => e.exerciseId === exerciseId)
    const current = entries[0]?.restSeconds ?? defaultRest
    const suggestion = suggestRestSeconds(exLogs, current, now)
    if (suggestion) out.push({ exerciseId, suggestion, routineEntryIds: entries.map((e) => e.id) })
  }
  return out.sort(
    (a, b) =>
      Math.abs(b.suggestion.medianSeconds - b.suggestion.currentSeconds) -
      Math.abs(a.suggestion.medianSeconds - a.suggestion.currentSeconds)
  )
}
