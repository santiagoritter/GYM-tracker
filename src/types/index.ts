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

/**
 * Campos que gestiona la capa de sync. En general NO los escriben los call
 * sites: los sellan los hooks de Dexie (`src/db/syncHooks.ts`) en cada
 * add/put/update/modify, así que es imposible olvidarse de marcar una
 * escritura como pendiente de subir.
 *
 * - `updatedAt`: reloj del cliente. Resuelve conflictos (last-write-wins).
 * - `dirty`: 1 = hay cambios locales sin subir. El pusher lo baja a 0.
 *
 * El cursor del pull NO usa `updatedAt` sino `server_updated_at`, que vive
 * solo en Postgres y lo sella un trigger: con el reloj del cliente, un
 * teléfono adelantado saltearía filas y no las bajaría nunca más.
 */
export interface SyncFields {
  updatedAt: string
  dirty: 0 | 1
}

// Flags booleanos como 0|1: IndexedDB no indexa booleans
export interface Workout extends SyncFields {
  id: string
  userId: string
  name: string
  startedAt: string
  finishedAt?: string
  notes?: string
  totalVolumeKg?: number
}

export interface WorkoutSet extends SyncFields {
  id: string
  workoutId: string
  userId: string
  exerciseId: string
  setNumber: number
  reps: number
  weightKg: number
  rpe?: number
  isWarmup: 0 | 1
  completed: 0 | 1
  supersetGroup?: number // heredado de la rutina: controla el descanso
}

export interface PersonalRecord extends SyncFields {
  id: string // = `${userId}_${exerciseId}` (un PR por ejercicio por usuario)
  userId: string
  exerciseId: string
  weightKg: number
  reps: number
  oneRmKg: number
  achievedAt: string
  workoutId: string
}

export interface Routine extends SyncFields {
  id: string
  userId: string
  name: string
  color: string
  isActive: 0 | 1
  isArchived: 0 | 1
}

export interface RoutineDay extends SyncFields {
  id: string
  routineId: string
  userId: string
  name: string
  dayOrder: number
  isRest: 0 | 1
}

export interface RoutineExercise extends SyncFields {
  id: string
  dayId: string
  userId: string
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

export interface LocalProfile extends SyncFields {
  id: string // = userId (relación 1:1 perfil↔usuario)
  units: 'kg' | 'lbs'
  // Vivía en la tabla `users` local, que desaparece al migrar a Supabase Auth
  onboardingComplete?: 0 | 1
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
export interface BodyMeasurement extends SyncFields {
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
export interface Achievement extends SyncFields {
  id: string
  userId: string
  unlockedAt: string
}

/**
 * Campos de las fotos, que se sincronizan en dos piezas: la metadata viaja
 * con el resto de las tablas y el JPEG va por una cola aparte a Storage.
 *
 * - `blob` es opcional porque en un dispositivo nuevo el pull baja la fila
 *   sin los bytes; se descargan lazy (ver `usePhotoUrl`).
 * - `uploaded` = 0 significa que el blob local todavía no subió.
 */
export interface PhotoSyncFields extends SyncFields {
  blob?: Blob
  storagePath?: string
  uploaded: 0 | 1
}

export interface ProgressPhoto extends PhotoSyncFields {
  id: string
  userId: string
  takenAt: string
  weightKg?: number
  notes?: string
}

// Foto de referencia personal para un ejercicio (ej: la máquina de tu gym).
// Una por ejercicio por usuario — subir una nueva reemplaza la anterior.
export interface ExercisePhoto extends PhotoSyncFields {
  id: string // = `${userId}_${exerciseId}`
  userId: string
  exerciseId: string
  createdAt: string
}

/** Tablas cuyas filas se sincronizan con Postgres. */
export type SyncedTable =
  | 'profile'
  | 'routines'
  | 'routineDays'
  | 'routineExercises'
  | 'workouts'
  | 'workoutSets'
  | 'personalRecords'
  | 'bodyMeasurements'
  | 'achievements'
  | 'progressPhotos'
  | 'exercisePhotos'

/**
 * Lápida de una fila borrada localmente. Existe porque el pull incremental
 * (`server_updated_at > cursor`) no puede ver una fila que ya no está: el
 * borrado tiene que viajar como un dato más. El push la convierte en un
 * `set deleted_at = now()` en el servidor y recién ahí la descarta.
 */
export interface Tombstone {
  id: string // = el id de la fila borrada
  tableName: SyncedTable
  userId: string
  storagePath?: string // para borrar también el objeto en Storage
  deletedAt: string
  dirty: 0 | 1
}

/** Cursores del pull y otros escalares internos de la capa de sync. */
export interface SyncStateRow {
  key: string
  value?: string
}
