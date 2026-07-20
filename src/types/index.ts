export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core'
  | 'cardio'

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'band'
  | 'kettlebell'
  | 'other'

export type MovementPattern =
  | 'push'
  | 'pull'
  | 'squat'
  | 'hinge'
  | 'carry'
  | 'isolation'
  | 'other'

export type Difficulty = 'beginner' | 'intermediate' | 'advanced'

export interface Exercise {
  id: string
  name: string
  nameEn: string
  musclePrimary: MuscleGroup[]
  muscleSecondary: MuscleGroup[]
  equipment: Equipment
  pattern: MovementPattern
  difficulty: Difficulty
  isCustom?: boolean
}

// Flags booleanos como 0|1: IndexedDB no indexa booleans
export interface Workout {
  id: string
  name: string
  startedAt: string
  finishedAt?: string
  notes?: string
  totalVolumeKg?: number
  synced: 0 | 1
  updatedAt: string
}

export interface WorkoutSet {
  id: string
  workoutId: string
  exerciseId: string
  setNumber: number
  reps: number
  weightKg: number
  rpe?: number
  isWarmup: 0 | 1
  completed: 0 | 1
  synced: 0 | 1
  updatedAt: string
  supersetGroup?: number // heredado de la rutina: controla el descanso
}

export interface PersonalRecord {
  id: string // = exerciseId (un PR por ejercicio en modo local)
  exerciseId: string
  weightKg: number
  reps: number
  oneRmKg: number
  achievedAt: string
  workoutId: string
}

export interface Routine {
  id: string
  name: string
  color: string
  isActive: 0 | 1
  isArchived: 0 | 1
  synced: 0 | 1
  updatedAt: string
}

export interface RoutineDay {
  id: string
  routineId: string
  name: string
  dayOrder: number
  isRest: 0 | 1
}

export interface RoutineExercise {
  id: string
  dayId: string
  exerciseId: string
  exerciseOrder: number
  setsTarget: number
  repsMin: number
  repsMax: number
  restSeconds: number
  notes?: string
  supersetGroup?: number // mismo número = mismo superset
}

export type FitnessGoal = 'strength' | 'mass' | 'endurance' | 'health' | 'general'
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced'
export type UserRole = 'admin' | 'user'

export interface User {
  id: string
  email: string
  passwordHash: string
  salt: string
  role: UserRole
  name: string
  createdAt: string
  onboardingComplete: 0 | 1
}

export interface LocalProfile {
  id: 'local'
  units: 'kg' | 'lbs'
  restTimerDefault: number // segundos
  bodyWeightKg?: number
  heightCm?: number
  dob?: string
  sex?: 'male' | 'female'
  goal?: FitnessGoal
  level?: ExperienceLevel
  weeklyGoal?: number // entrenos objetivo por semana
  reminderEnabled?: 0 | 1
  reminderTime?: string // "HH:MM" 24h
  reminderDays?: number[] // 0=domingo … 6=sábado
}

// Registro histórico de peso corporal y medidas
export interface BodyMeasurement {
  id: string
  takenAt: string
  weightKg?: number
  bodyFatPct?: number
  chestCm?: number
  waistCm?: number
  hipsCm?: number
  armCm?: number
  thighCm?: number
  notes?: string
}

// Logro desbloqueado (el id es la clave del catálogo en lib/achievements)
export interface Achievement {
  id: string
  unlockedAt: string
}

// En modo local la foto vive como Blob en IndexedDB
// (en Fase 4 se sube comprimida a Supabase Storage)
export interface ProgressPhoto {
  id: string
  takenAt: string
  weightKg?: number
  notes?: string
  blob: Blob
}
