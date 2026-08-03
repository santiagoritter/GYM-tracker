import Dexie, { type Table } from 'dexie'
import type {
  Achievement,
  BodyMeasurement,
  EmailVerification,
  Exercise,
  ExercisePhoto,
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
  emailVerifications!: Table<EmailVerification, string>
  exercisePhotos!: Table<ExercisePhoto, string>

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
    // v6: verificación de email + campo emailVerified en users
    this.version(6).stores({
      emailVerifications: 'id',
    }).upgrade(async (tx) => {
      await tx.table('users').toCollection().modify((u) => {
        if (u.emailVerified === undefined) u.emailVerified = 0
      })
    })
    // v7: aislamiento de datos por usuario. Antes de esto, rutinas/entrenos/PRs
    // eran globales y cualquier cuenta veía los datos de cualquier otra en el
    // mismo dispositivo. Todo lo existente se reasigna a la cuenta admin
    // (única cuenta con datos reales hasta ahora); instalaciones nuevas no
    // tienen nada que migrar.
    this.version(7).stores({
      routines: 'id, userId, isActive, isArchived',
      workouts: 'id, userId, startedAt, finishedAt, synced',
      personalRecords: 'id, userId, exerciseId',
      bodyMeasurements: 'id, userId, takenAt',
      achievements: 'id, userId, unlockedAt',
      progressPhotos: 'id, userId, takenAt',
      profile: 'id',
    }).upgrade(async (tx) => {
      const admin = await tx.table('users').filter((u) => u.role === 'admin').first()
      if (!admin) return // instalación nueva, nada que migrar
      const uid = admin.id as string

      for (const t of ['routines', 'workouts', 'bodyMeasurements', 'progressPhotos']) {
        await tx.table(t).toCollection().modify((row) => {
          if (!row.userId) row.userId = uid
        })
      }
      // personalRecords y achievements cambian de PK (antes: exerciseId / achievementId
      // sueltos, ahora: prefijados por usuario para no colisionar entre cuentas)
      const oldPRs = await tx.table('personalRecords').toArray()
      for (const pr of oldPRs) {
        if (pr.userId) continue
        await tx.table('personalRecords').delete(pr.id)
        await tx.table('personalRecords').put({ ...pr, id: `${uid}_${pr.exerciseId}`, userId: uid })
      }
      const oldAchievements = await tx.table('achievements').toArray()
      for (const a of oldAchievements) {
        if (a.userId) continue
        await tx.table('achievements').delete(a.id)
        await tx.table('achievements').put({ ...a, id: `${uid}_${a.id}`, userId: uid })
      }
      // profile: PK única 'local' -> PK = userId (relación 1:1 perfil↔usuario)
      const oldProfile = await tx.table('profile').get('local')
      if (oldProfile) {
        await tx.table('profile').delete('local')
        await tx.table('profile').put({ ...oldProfile, id: uid })
      }
    })
    // v8: foto de referencia por ejercicio (una por usuario por ejercicio)
    this.version(8).stores({
      exercisePhotos: 'id, userId, exerciseId, [userId+exerciseId]',
    })
  }
}

export const db = new GymTrackerDB()

/**
 * Precarga el catálogo de ejercicios (compartido entre todas las cuentas).
 * bulkPut es idempotente: las instalaciones existentes reciben ejercicios
 * nuevos del catálogo en cada versión sin duplicar (los IDs son slugs
 * estables) ni tocar los custom. El perfil ya no se crea acá — es por
 * usuario y se asegura después de autenticar (ver ensureProfile en auth.ts).
 */
export async function seedIfEmpty(): Promise<void> {
  await db.exercises.bulkPut(EXERCISES_SEED)
}

/** Perfil por defecto para un usuario recién autenticado. */
export async function ensureProfile(userId: string): Promise<void> {
  const profile = await db.profile.get(userId)
  if (!profile) {
    await db.profile.add({ id: userId, units: 'kg', restTimerDefault: 90 })
  }
}
