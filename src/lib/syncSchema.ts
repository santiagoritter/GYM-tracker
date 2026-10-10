import type { SyncedTable } from '@/types'

/**
 * Lo que describe CÓMO viaja cada tabla local a Postgres (nombres, booleanos,
 * campos solo locales). Vive aparte de `sync.ts` (que importa el cliente de
 * Supabase) para que `scripts/test-sync-schema.mts` pueda comprobar, sin red,
 * que todo campo que el cliente envía existe como columna en las migraciones:
 * un campo local nuevo sin columna hace que PostgREST rechace el lote entero y
 * nada de esa tabla vuelva a subir (así dejaron de llegar los entrenos).
 */

// Postgres usa snake_case; local (Dexie/TS) usa camelCase. Es una
// conversión regular en TODOS los campos de estas 12 tablas (verificado
// contra supabase/migrations/0002-0006), así que una función genérica
// alcanza — no hace falta un mapeo campo por campo.
export function camelToSnake(key: string): string {
  return key.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase())
}

// El nombre de tabla SÍ tiene una irregularidad: local es "profile"
// (singular, PK = userId, relación 1:1) pero Postgres es "profiles"
// (plural, como el resto). El resto ya son plurales de los dos lados.
export const REMOTE_TABLE: Record<SyncedTable, string> = {
  profile: 'profiles',
  routines: 'routines',
  routineDays: 'routine_days',
  routineExercises: 'routine_exercises',
  workouts: 'workouts',
  workoutSets: 'workout_sets',
  personalRecords: 'personal_records',
  bodyMeasurements: 'body_measurements',
  achievements: 'achievements',
  progressPhotos: 'progress_photos',
  exercisePhotos: 'exercise_photos',
  calorieEntries: 'calorie_entries',
  restLogs: 'rest_logs',
  notifications: 'notifications',
}

// Postgres guarda estos campos como boolean; local los guarda 0|1 (IndexedDB
// no indexa booleans). Todo lo que no está listado acá viaja tal cual.
export const BOOLEAN_FIELDS: Partial<Record<SyncedTable, readonly string[]>> = {
  routines: ['isActive', 'isArchived'],
  routineDays: ['isRest'],
  workoutSets: ['isWarmup', 'completed'],
  profile: ['onboardingComplete', 'reminderEnabled', 'calorieTrackingEnabled', 'motivationalNotifsEnabled'],
  restLogs: ['discarded'],
  notifications: ['read'],
}

// Bookkeeping puramente del cliente, sin columna en Postgres: la cola de
// push (`dirty`) y el blob/flag de subida de las fotos (ver nota de
// Storage arriba).
export const LOCAL_ONLY_FIELDS: Partial<Record<SyncedTable, readonly string[]>> = {
  progressPhotos: ['blob', 'uploaded'],
  exercisePhotos: ['blob', 'uploaded'],
}

