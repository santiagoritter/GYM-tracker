import type { Exercise, MuscleGroup, PersonalRecord } from '@/types'
import { COEF } from '@/lib/recommendation'
import { getStrengthLevel, type StrengthResult } from '@/lib/strengthStandards'

/**
 * Nivel de fuerza por grupo muscular, sin tabla de estándares nueva.
 *
 * `STANDARDS` (strengthStandards.ts) solo cubre 5 lifts. Para un grupo sin
 * estándar directo (bíceps, gemelos, core...) se reutiliza `COEF` — la tabla
 * que ya relaciona ~100 ejercicios con su lift de referencia — para
 * despejar el 1RM equivalente: si el PR de curl con barra es 40kg y su
 * factor contra banca es 0.38, el 1RM equivalente en banca es 40/0.38, que
 * ya se puede clasificar con `getStrengthLevel('bench-press', ...)` en la
 * misma escala novato→campeón que el resto de la app.
 *
 * cardio queda afuera: no tiene noción de 1RM.
 */
const TRACKED_MUSCLES: MuscleGroup[] = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
  'quads', 'hamstrings', 'glutes', 'calves', 'core',
]

export interface MuscleGroupStrength {
  muscle: MuscleGroup
  result: StrengthResult
  sourceExerciseId: string | null
  sourceExerciseName: string | null
}

const NO_DATA: StrengthResult = {
  level: 'no_data',
  ratio: 0,
  progress: 0,
  nextLevel: 'novice',
  kgToNext: 0,
}

/**
 * Por cada grupo, toma el ejercicio con mejor progreso entre los que
 * tienen `musclePrimary` incluyendo ese grupo y coeficiente conocido. No
 * promedia entre ejercicios de naturaleza distinta (curl vs press militar):
 * promediar cosas incomparables agrega ruido, no información.
 */
export function getMuscleGroupLevels(
  exercises: Exercise[],
  prByExerciseId: Map<string, PersonalRecord>,
  bodyWeightKg: number,
  sex: 'male' | 'female',
  ageYears: number
): MuscleGroupStrength[] {
  return TRACKED_MUSCLES.map((muscle) => {
    let best: StrengthResult | null = null
    let bestExercise: Exercise | null = null

    for (const exercise of exercises) {
      if (!exercise.musclePrimary.includes(muscle)) continue
      const coef = COEF[exercise.id]
      if (!coef || coef.factor <= 0) continue
      const pr = prByExerciseId.get(exercise.id)
      if (!pr || pr.oneRmKg <= 0) continue

      const referenceOneRm = pr.oneRmKg / coef.factor
      const result = getStrengthLevel(coef.ref, referenceOneRm, bodyWeightKg, sex, ageYears)
      if (!best || result.progress > best.progress) {
        best = result
        bestExercise = exercise
      }
    }

    return {
      muscle,
      result: best ?? NO_DATA,
      sourceExerciseId: bestExercise?.id ?? null,
      sourceExerciseName: bestExercise?.name ?? null,
    }
  })
}
