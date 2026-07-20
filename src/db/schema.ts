import Dexie, { type Table } from 'dexie'
import type {
  Achievement,
  BodyMeasurement,
  Exercise,
  LocalProfile,
  PersonalRecord,
  ProgressPhoto,
  Routine,
  RoutineDay,
  RoutineExercise,
  User,
  Workout,
  WorkoutSet,
} from '@/types'
import { EXERCISES_SEED } from '@/data/exercises'

export class GymTrackerDB extends Dexie {
  workouts!: Table<Workout, string>
  workoutSets!: Table<WorkoutSet, string>
  exercises!: Table<Exercise, string>
  personalRecords!: Table<PersonalRecord, string>
  profile!: Table<LocalProfile, string>
  routines!: Table<Routine, string>
  routineDays!: Table<RoutineDay, string>
  routineExercises!: Table<RoutineExercise, string>
  progressPhotos!: Table<ProgressPhoto, string>
  users!: Table<User, string>
  bodyMeasurements!: Table<BodyMeasurement, string>
  achievements!: Table<Achievement, string>

  constructor() {
    super('GymTrackerDB')
    this.version(1).stores({
      workouts: 'id, startedAt, finishedAt, synced',
      workoutSets: 'id, workoutId, exerciseId, synced, [workoutId+exerciseId]',
      exercises: 'id, equipment, pattern, *musclePrimary',
      personalRecords: 'id, exerciseId',
      profile: 'id',
    })
    // v2: rutinas (Fase 2)
    this.version(2).stores({
      workouts: 'id, startedAt, finishedAt, synced',
      workoutSets: 'id, workoutId, exerciseId, synced, [workoutId+exerciseId]',
      exercises: 'id, equipment, pattern, *musclePrimary',
      personalRecords: 'id, exerciseId',
      profile: 'id',
      routines: 'id, isActive, isArchived',
      routineDays: 'id, routineId, dayOrder',
      routineExercises: 'id, dayId, exerciseOrder',
    })
    // v3: fotos de progreso (Fase 3). El blob no se indexa, solo takenAt.
    this.version(3).stores({
      progressPhotos: 'id, takenAt',
    })
    // v4: usuarios para auth local (Fase auth)
    this.version(4).stores({
      users: 'id, email, role',
    })
    // v5: medidas corporales y logros (Fase "app viva")
    this.version(5).stores({
      bodyMeasurements: 'id, takenAt',
      achievements: 'id, unlockedAt',
    })
  }
}

export const db = new GymTrackerDB()

/**
 * Precarga el catálogo y el perfil local. bulkPut es idempotente: las
 * instalaciones existentes reciben ejercicios nuevos del catálogo en cada
 * versión sin duplicar (los IDs son slugs estables) ni tocar los custom.
 */
export async function seedIfEmpty(): Promise<void> {
  await db.exercises.bulkPut(EXERCISES_SEED)
  const profile = await db.profile.get('local')
  if (!profile) {
    await db.profile.add({ id: 'local', units: 'kg', restTimerDefault: 90 })
  }
}
