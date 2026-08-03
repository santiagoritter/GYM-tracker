import { db } from '@/db/schema'

/**
 * Helpers de acceso a datos scopeados por usuario. Cada cuenta local tiene
 * sus propias rutinas/entrenos/PRs/etc — estas queries usan el índice
 * `userId` en vez de traer la tabla completa y filtrar en memoria.
 */
export const routinesFor = (userId: string) => db.routines.where('userId').equals(userId)
export const workoutsFor = (userId: string) => db.workouts.where('userId').equals(userId)
export const personalRecordsFor = (userId: string) =>
  db.personalRecords.where('userId').equals(userId)
export const bodyMeasurementsFor = (userId: string) =>
  db.bodyMeasurements.where('userId').equals(userId)
export const achievementsFor = (userId: string) => db.achievements.where('userId').equals(userId)
export const progressPhotosFor = (userId: string) =>
  db.progressPhotos.where('userId').equals(userId)
export const exercisePhotoFor = (userId: string, exerciseId: string) =>
  db.exercisePhotos.get(`${userId}_${exerciseId}`)

// Tablas hijas: se resuelven vía su FK hacia la tabla padre ya scopeada,
// sin necesitar userId propio (evita desnormalización).
export const routineDaysOf = (routineId: string) =>
  db.routineDays.where('routineId').equals(routineId)
export const routineExercisesOf = (dayId: string) =>
  db.routineExercises.where('dayId').equals(dayId)
export const workoutSetsOf = (workoutId: string) =>
  db.workoutSets.where('workoutId').equals(workoutId)
