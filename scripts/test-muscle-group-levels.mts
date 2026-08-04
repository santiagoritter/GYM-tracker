/**
 * Verifica getMuscleGroupLevels: debe derivar niveles para grupos SIN
 * estándar directo (bíceps, isquiotibiales) a partir de PRs en ejercicios
 * secundarios, usando el COEF de recommendation.ts para convertir al 1RM
 * equivalente de un lift de referencia.
 */
import { EXERCISES_SEED } from '../src/data/exercises'
import { getMuscleGroupLevels } from '../src/lib/muscleGroupStrength'
import type { PersonalRecord } from '../src/types'

const fail: string[] = []
const check = (cond: boolean, msg: string) => { if (!cond) fail.push(msg) }

const pr = (exerciseId: string, oneRmKg: number): PersonalRecord => ({
  id: `u1_${exerciseId}`,
  userId: 'u1',
  exerciseId,
  weightKg: oneRmKg,
  reps: 1,
  oneRmKg,
  achievedAt: '',
  workoutId: 'w1',
  dirty: 1,
  updatedAt: '',
})

// Hombre, 80kg, 30 años (multiplicador de edad = 1.0)
const BODY_WEIGHT = 80
const SEX = 'male' as const
const AGE = 30

// ── 1. Sin PRs: todos los grupos con carga dan no_data, cardio no aparece ──
const empty = getMuscleGroupLevels(EXERCISES_SEED, new Map(), BODY_WEIGHT, SEX, AGE)
check(empty.length === 11, `deberían evaluarse 11 grupos (sin cardio), dio ${empty.length}`)
check(!empty.some((l) => l.muscle === 'cardio'), 'cardio no debería estar en la lista')
check(empty.every((l) => l.result.level === 'no_data'), 'sin PRs todos deberían ser no_data')

// ── 2. PR en un ejercicio secundario (sin estándar propio) deriva un nivel ─
// barbell-curl: factor 0.38 sobre bench-press. PR de 40kg -> 1RM equivalente
// en banca = 40/0.38 = 105.3kg. Con 80kg de peso corporal, ratio = 1.32,
// que cae en el escalón "intermediate" de bench-press (male: 1.25).
const withBiceps = getMuscleGroupLevels(
  EXERCISES_SEED,
  new Map([['barbell-curl', pr('barbell-curl', 40)]]),
  BODY_WEIGHT,
  SEX,
  AGE
)
const biceps = withBiceps.find((l) => l.muscle === 'biceps')!
check(biceps.result.level !== 'no_data', 'bíceps debería tener nivel derivado de barbell-curl')
check(biceps.result.level === 'intermediate', `esperaba intermediate, dio ${biceps.result.level}`)
check(biceps.sourceExerciseId === 'barbell-curl', `esperaba barbell-curl como fuente, dio ${biceps.sourceExerciseId}`)

// Ningún otro grupo debería haberse contaminado por este único PR
const others = withBiceps.filter((l) => l.muscle !== 'biceps')
check(others.every((l) => l.result.level === 'no_data'), 'un PR de curl no debería afectar otros grupos')

// ── 3. Entre dos ejercicios del mismo grupo, gana el de mayor progreso ────
// hamstrings: leg-curl (ref squat, factor 0.35) y stiff-leg-deadlift
// (ref deadlift, factor 0.65). Un PR generoso en stiff-leg-deadlift debería
// ganarle a uno mediocre en leg-curl.
const withHamstrings = getMuscleGroupLevels(
  EXERCISES_SEED,
  new Map([
    ['leg-curl', pr('leg-curl', 20)], // 1RM eq. sentadilla = 20/0.35 = 57kg, ratio 0.71 -> beginner
    ['stiff-leg-deadlift', pr('stiff-leg-deadlift', 100)], // 1RM eq. deadlift = 100/0.65 = 153.8kg, ratio 1.92 -> intermediate
  ]),
  BODY_WEIGHT,
  SEX,
  AGE
)
const hamstrings = withHamstrings.find((l) => l.muscle === 'hamstrings')!
check(
  hamstrings.sourceExerciseId === 'stiff-leg-deadlift',
  `debería ganar el ejercicio de mayor progreso, dio ${hamstrings.sourceExerciseId}`
)

// ── 4. Cobertura: los 11 grupos con carga tienen al menos un ejercicio
//    en el catálogo cuyo id está en COEF (si no, ese grupo nunca podría
//    mostrar un nivel derivado y la feature sería inútil para él) ─────────
const coefIds = new Set(Object.keys((await import('../src/lib/recommendation')).COEF))
const exercisesByMuscle = new Map<string, string[]>()
for (const ex of EXERCISES_SEED) {
  for (const m of ex.musclePrimary) {
    if (!exercisesByMuscle.has(m)) exercisesByMuscle.set(m, [])
    exercisesByMuscle.get(m)!.push(ex.id)
  }
}
for (const l of empty) {
  const candidates = exercisesByMuscle.get(l.muscle) ?? []
  const covered = candidates.some((id) => coefIds.has(id))
  check(covered, `${l.muscle}: ningún ejercicio de este grupo tiene coeficiente en COEF`)
}

console.log(`Grupos evaluados: ${empty.length} (cardio excluido correctamente)`)
console.log(`Bíceps derivado de curl 40kg: ${biceps.result.level} (fuente: ${biceps.sourceExerciseId})`)
console.log(`Isquiotibiales, gana el de mayor progreso: ${hamstrings.sourceExerciseId}`)

if (fail.length) {
  console.error(`\n❌ ${fail.length} FALLOS:`)
  fail.forEach((f) => console.error('  - ' + f))
  process.exit(1)
}
console.log('✅ Niveles por grupo muscular correctos, con cobertura de los 11 grupos.')
