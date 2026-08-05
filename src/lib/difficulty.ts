import type { Difficulty } from '@/types'

/** Compartido entre Exercises.tsx (lista + filtro) y ExerciseDetailSheet.tsx
 * (sheet de detalle) — antes vivía duplicado solo en el sheet. */
export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
}

export const DIFFICULTY_COLOR: Record<Difficulty, string> = {
  beginner: 'text-success',
  intermediate: 'text-warning',
  advanced: 'text-danger',
}

export const DIFFICULTY_DOT: Record<Difficulty, string> = {
  beginner: 'bg-success',
  intermediate: 'bg-warning',
  advanced: 'bg-danger',
}

export const DIFFICULTY_ORDER: Difficulty[] = ['beginner', 'intermediate', 'advanced']
