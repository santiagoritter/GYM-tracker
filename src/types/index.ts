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
  userId: string
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
  userId: string
  exerciseId: string
  weightKg: number
  reps: number
  oneRmKg: number
  achievedAt: string
  workoutId: string
}

export interface Routine {
  id: string
  userId: string
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
  emailVerified: 0 | 1
}

export interface EmailVerification {
  id: string          // = userId
  code: string        // 6 dígitos hasheados
  expiresAt: string   // ISO
  lastSentAt: string  // ISO — cooldown de reenvío
  attempts: number    // intentos fallidos de verificación (máx 5)
}

export interface LocalProfile {
  id: string // = userId (relación 1:1 perfil↔usuario)
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
  userId: string
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

// Logro desbloqueado (id = `${userId}_${claveDelCatalogo}` en lib/achievements)
export interface Achievement {
  id: string
  userId: string
  unlockedAt: string
}

// En modo local la foto vive como Blob en IndexedDB
// (en Fase 4 se sube comprimida a Supabase Storage)
export interface ProgressPhoto {
  id: string
  userId: string
  takenAt: string
  weightKg?: number
  notes?: string
  blob: Blob
}

// Foto de referencia personal para un ejercicio (ej: la máquina de tu gym).
// Una por ejercicio por usuario — subir una nueva reemplaza la anterior.
export interface ExercisePhoto {
  id: string // = `${userId}_${exerciseId}`
  userId: string
  exerciseId: string
  blob: Blob
  createdAt: string
}
