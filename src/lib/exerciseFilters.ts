import type { Equipment, MuscleGroup } from '@/types'
import { MUSCLE_LABELS } from '@/components/gym/MuscleChip'

/** Único origen de estas listas — antes vivían copiadas en Exercises.tsx
 * y ExercisePicker.tsx, cada una con su propia versión. */
export const MUSCLE_FILTERS = Object.keys(MUSCLE_LABELS) as MuscleGroup[]

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Barra',
  dumbbell: 'Mancuernas',
  machine: 'Máquina',
  cable: 'Polea',
  bodyweight: 'Peso corporal',
  band: 'Banda',
  kettlebell: 'Kettlebell',
  other: 'Otro',
}

export const EQUIPMENT_FILTERS = Object.keys(EQUIPMENT_LABELS) as Equipment[]
