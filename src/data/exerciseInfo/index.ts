import { CHEST_INFO } from './chest'
import { BACK_INFO } from './back'
import { SHOULDERS_INFO } from './shoulders'
import { ARMS_INFO } from './arms'
import { LEGS_INFO } from './legs'
import { CORE_INFO } from './core'
import { CARDIO_INFO } from './cardio'

export interface ExerciseInfo {
  description: string
  tips: string[]
  commonMistakes?: string[]
  /**
   * Términos de búsqueda para el video de técnica. Se usa una búsqueda y no
   * un ID de video a propósito: un ID inventado o un video que el autor borra
   * deja un link muerto, y acá hay 107 ejercicios que mantener.
   */
  videoQuery?: string
}

export const EXERCISE_INFO: Record<string, ExerciseInfo> = {
  ...CHEST_INFO,
  ...BACK_INFO,
  ...SHOULDERS_INFO,
  ...ARMS_INFO,
  ...LEGS_INFO,
  ...CORE_INFO,
  ...CARDIO_INFO,
}

export function getExerciseInfo(exerciseId: string): ExerciseInfo | null {
  return EXERCISE_INFO[exerciseId] ?? null
}

/**
 * URL de búsqueda en YouTube para la técnica del ejercicio. Siempre resuelve
 * a resultados reales, sin links muertos que mantener.
 */
export function getTechniqueVideoUrl(exerciseName: string, info?: ExerciseInfo | null): string {
  const query = info?.videoQuery ?? `${exerciseName} técnica correcta`
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
}
