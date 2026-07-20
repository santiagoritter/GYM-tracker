// Estándares de fuerza: ratio 1RM / peso corporal, ajustado por edad y sexo.
// Fuente: adaptado de ExRx.net Strength Standards y Symmetric Strength.
// Metodología completa en docs/08-NIVELES-FUERZA.md

export type StrengthLevel =
  | 'no_data'
  | 'novice'
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'elite'
  | 'champion'

export const LEVEL_LABELS: Record<StrengthLevel, string> = {
  no_data: 'Sin datos',
  novice: 'Novato',
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
  elite: 'Elite',
  champion: 'Campeón',
}

interface LevelThresholds {
  novice: number
  beginner: number
  intermediate: number
  advanced: number
  elite: number
  champion: number
}

// Las claves son los slugs del catálogo de ejercicios (src/data/exercises.ts)
export const STANDARDS: Record<
  string,
  { label: string; male: LevelThresholds; female: LevelThresholds }
> = {
  squat: {
    label: 'Sentadilla',
    male: { novice: 0.75, beginner: 1.25, intermediate: 1.75, advanced: 2.25, elite: 2.75, champion: 3.0 },
    female: { novice: 0.5, beginner: 0.75, intermediate: 1.25, advanced: 1.5, elite: 1.75, champion: 2.0 },
  },
  'bench-press': {
    label: 'Press de banca',
    male: { novice: 0.5, beginner: 0.75, intermediate: 1.25, advanced: 1.75, elite: 2.0, champion: 2.5 },
    female: { novice: 0.25, beginner: 0.5, intermediate: 0.75, advanced: 1.0, elite: 1.25, champion: 1.5 },
  },
  deadlift: {
    label: 'Peso muerto',
    male: { novice: 1.0, beginner: 1.5, intermediate: 2.0, advanced: 2.5, elite: 3.0, champion: 3.5 },
    female: { novice: 0.75, beginner: 1.0, intermediate: 1.5, advanced: 1.75, elite: 2.0, champion: 2.5 },
  },
  'overhead-press': {
    label: 'Press militar',
    male: { novice: 0.35, beginner: 0.55, intermediate: 0.8, advanced: 1.1, elite: 1.3, champion: 1.5 },
    female: { novice: 0.2, beginner: 0.35, intermediate: 0.55, advanced: 0.75, elite: 1.0, champion: 1.25 },
  },
  'barbell-row': {
    label: 'Remo con barra',
    male: { novice: 0.5, beginner: 0.75, intermediate: 1.0, advanced: 1.35, elite: 1.6, champion: 1.75 },
    female: { novice: 0.35, beginner: 0.55, intermediate: 0.75, advanced: 1.0, elite: 1.25, champion: 1.5 },
  },
}

const AGE_MULTIPLIERS: Array<{ maxAge: number; multiplier: number }> = [
  { maxAge: 17, multiplier: 0.9 },
  { maxAge: 34, multiplier: 1.0 },
  { maxAge: 44, multiplier: 0.95 },
  { maxAge: 54, multiplier: 0.87 },
  { maxAge: 64, multiplier: 0.78 },
  { maxAge: 999, multiplier: 0.7 },
]

export function getAgeMultiplier(ageYears: number): number {
  return AGE_MULTIPLIERS.find((m) => ageYears <= m.maxAge)?.multiplier ?? 1.0
}

export function ageFromDob(dobIso: string): number {
  const dob = new Date(dobIso)
  const now = new Date()
  let age = now.getFullYear() - dob.getFullYear()
  const monthDiff = now.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) age--
  return age
}

const LEVEL_ORDER: Exclude<StrengthLevel, 'no_data'>[] = [
  'novice',
  'beginner',
  'intermediate',
  'advanced',
  'elite',
  'champion',
]

export interface StrengthResult {
  level: StrengthLevel
  ratio: number
  /** Progreso 0..1 dentro del recorrido novato → campeón */
  progress: number
  nextLevel: StrengthLevel | null
  kgToNext: number
}

export function getStrengthLevel(
  exerciseKey: string,
  oneRmKg: number,
  bodyWeightKg: number,
  sex: 'male' | 'female',
  ageYears: number
): StrengthResult {
  const standard = STANDARDS[exerciseKey]
  if (!standard || oneRmKg <= 0 || bodyWeightKg <= 0) {
    return { level: 'no_data', ratio: 0, progress: 0, nextLevel: 'novice', kgToNext: 0 }
  }

  const ratio = oneRmKg / bodyWeightKg
  const ageMultiplier = getAgeMultiplier(ageYears)
  const thresholds = standard[sex]

  let level: StrengthLevel = 'no_data'
  for (const l of LEVEL_ORDER) {
    if (ratio >= thresholds[l] * ageMultiplier) level = l
    else break
  }

  const currentIndex = level === 'no_data' ? -1 : LEVEL_ORDER.indexOf(level)
  const nextLevel = LEVEL_ORDER[currentIndex + 1] ?? null
  const kgToNext = nextLevel
    ? Math.max(0, thresholds[nextLevel] * ageMultiplier * bodyWeightKg - oneRmKg)
    : 0

  // Progreso global: posición del ratio entre novato y campeón
  const minRatio = thresholds.novice * ageMultiplier
  const maxRatio = thresholds.champion * ageMultiplier
  const progress = Math.min(1, Math.max(0, (ratio - minRatio) / (maxRatio - minRatio)))

  return {
    level,
    ratio: Math.round(ratio * 100) / 100,
    progress,
    nextLevel,
    kgToNext: Math.round(kgToNext * 2) / 2, // redondeo a 0.5kg
  }
}
