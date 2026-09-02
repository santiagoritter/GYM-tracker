import Dexie, { type Table } from 'dexie'
import type {
  Achievement,
  BodyMeasurement,
  CalorieEntry,
  EmailVerification,
  Exercise,
  ExercisePhoto,
  LocalProfile,
  PersonalRecord,
  ProgressPhoto,
  Routine,
  RoutineDay,
  RoutineExercise,
  Run,
  SyncedTable,
  SyncStateRow,
  Tombstone,
  User,
  Workout,
  WorkoutSet,
} from '@/types'
import { EXERCISES_SEED } from '@/data/exercises'

/**
 * Tablas que viajan a Postgres, en orden de dependencia: los padres antes
 * que las hijas. El push respeta este orden porque la FK compuesta del
 * servidor rechaza una `workout_set` cuyo `workout` todavía no llegó.
 */
export const SYNC_ORDER: readonly SyncedTable[] = [
  'profile',
  'routines',
  'routineDays',
  'routineExercises',
  'workouts',
  'workoutSets',
  'personalRecords',
  'bodyMeasurements',
  'achievements',
  'progressPhotos',
  'exercisePhotos',
  'calorieEntries',
] as const

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
  tombstones!: Table<Tombstone, string>
  syncState!: Table<SyncStateRow, string>
  calorieEntries!: Table<CalorieEntry, string>
  runs!: Table<Run, string>

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
    // v9: preparación para el sync con Supabase.
    //
    //  - `dirty` reemplaza al flag `synced`, que era vestigial: solo existía
    //    en workouts/workoutSets/routines y la mayoría de los call sites ni
    //    lo escribían (setActiveRoutine, los update de RoutineEditor, las
    //    altas de medidas y fotos…). Usarlo como cola de push habría perdido
    //    escrituras en silencio. Ahora lo sellan los hooks (ver syncHooks.ts).
    //  - Las tablas hijas ganan `userId` propio: el RLS del servidor filtra
    //    por columna en vez de por join de dos saltos, y el pull incremental
    //    puede usar el índice (userId, server_updated_at).
    //  - `tombstones` hace que los borrados se puedan propagar (ver el tipo).
    this.version(9).stores({
      routines: 'id, userId, isActive, isArchived, dirty',
      routineDays: 'id, routineId, userId, dayOrder, dirty',
      routineExercises: 'id, dayId, userId, exerciseOrder, dirty',
      workouts: 'id, userId, startedAt, finishedAt, dirty',
      workoutSets: 'id, workoutId, userId, exerciseId, dirty, [workoutId+exerciseId]',
      personalRecords: 'id, userId, exerciseId, dirty',
      bodyMeasurements: 'id, userId, takenAt, dirty',
      achievements: 'id, userId, unlockedAt, dirty',
      progressPhotos: 'id, userId, takenAt, dirty, uploaded',
      exercisePhotos: 'id, userId, exerciseId, [userId+exerciseId], dirty, uploaded',
      profile: 'id, dirty',
      tombstones: 'id, userId, tableName, dirty',
      syncState: 'key',
    }).upgrade(async (tx) => {
      const now = new Date().toISOString()

      // 1. Backfill de userId en las hijas, resolviendo la FK hacia el padre.
      const routineUser = new Map<string, string>(
        (await tx.table('routines').toArray()).map((r) => [r.id, r.userId])
      )
      const dayUser = new Map<string, string>()
      await tx.table('routineDays').toCollection().modify((d) => {
        d.userId = routineUser.get(d.routineId) ?? ''
        dayUser.set(d.id, d.userId)
      })
      await tx.table('routineExercises').toCollection().modify((e) => {
        e.userId = dayUser.get(e.dayId) ?? ''
      })
      const workoutUser = new Map<string, string>(
        (await tx.table('workouts').toArray()).map((w) => [w.id, w.userId])
      )
      await tx.table('workoutSets').toCollection().modify((s) => {
        s.userId = workoutUser.get(s.workoutId) ?? ''
      })

      // 2. Todo lo preexistente arranca sucio: nunca se subió a ningún lado.
      for (const table of SYNC_ORDER) {
        await tx.table(table).toCollection().modify((row) => {
          row.updatedAt ??= now
          row.dirty = 1
          delete row.synced
        })
      }
      for (const table of ['progressPhotos', 'exercisePhotos']) {
        await tx.table(table).toCollection().modify((p) => { p.uploaded = 0 })
      }

      // 3. onboardingComplete vivía en `users`, que desaparece al migrar a
      //    Supabase Auth. Se mueve al perfil, que sí se sincroniza.
      const users = await tx.table('users').toArray()
      for (const u of users) {
        const profile = await tx.table('profile').get(u.id)
        if (profile) {
          await tx.table('profile').update(u.id, {
            onboardingComplete: u.onboardingComplete ?? 0,
          })
        }
      }
    })
    // v10: contador de calorías opcional (Redisenio.md §2.6). Tabla nueva
    // sin datos que migrar — el .upgrade() no mueve nada, solo confirma
    // que la instalación existente sigue sana y deja constancia del paso,
    // igual que v3/v4/v5 en su momento.
    this.version(10).stores({
      calorieEntries: 'id, userId, loggedAt, dirty',
    }).upgrade(async () => {
      // no-op deliberado
    })
    // v11: % de grasa corporal opcional en el perfil (valor "actual", no
    // histórico — mismo concepto que bodyWeightKg, distinto del historial
    // en bodyMeasurements). Campo no indexado, no toca .stores().
    this.version(11).stores({}).upgrade(async () => {
      // no-op: campo opcional sin valor por defecto que backfillear
    })
    // v12: fix — src/lib/sync.ts escribía `null` (el NULL de Postgres) en
    // vez de `undefined` para supersetGroup cuando no había grupo. Como
    // Workout.tsx compara con `!== undefined` (nunca `== null`), y
    // `null === null` entre dos filas cualesquiera, cualquier ejercicio
    // que hubiera sincronizado una sola vez terminaba "emparejado" con
    // cualquier otro — bloqueaba el descanso entre series en toda la app.
    // Ya se corrigió el mapeo en sync.ts; esto limpia lo que quedó mal
    // en los dispositivos que ya sincronizaron con el bug.
    this.version(12).stores({}).upgrade(async (tx) => {
      await tx
        .table('workoutSets')
        .toCollection()
        .filter((s) => (s as { supersetGroup?: number | null }).supersetGroup === null)
        .modify({ supersetGroup: undefined })
      await tx
        .table('routineExercises')
        .toCollection()
        .filter((e) => (e as { supersetGroup?: number | null }).supersetGroup === null)
        .modify({ supersetGroup: undefined })
    })
    // v13: salidas a correr con GPS (B6). Tabla nueva, sin datos que migrar.
    // `route` (RunPointRecord[]) y `summary` no se indexan. Las columnas
    // `userId`/`dirty` la dejan lista para sync, pero todavía NO entra en
    // SYNC_ORDER — igual que cardio/fotos difirieron su sync.
    this.version(13).stores({
      runs: 'id, userId, workoutId, startedAt, dirty',
    }).upgrade(async () => {
      // no-op: tabla nueva
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

/**
 * Perfil por defecto para un usuario recién autenticado.
 *
 * El get+add corre en una sola transacción a propósito: en un dispositivo
 * nuevo, el login/recuperación de contraseña dispara `runSync()` (ver
 * main.tsx) que en paralelo baja el perfil real del servidor y lo escribe
 * local con `put()` — sin esta transacción, esta función podía ver "no
 * hay perfil" un instante antes de que el pull lo escribiera, y su propio
 * `add()` chocaba contra esa fila que acababa de aparecer
 * (`ConstraintError`, visto en producción al recuperar contraseña desde
 * un navegador donde la cuenta nunca había entrado). Una transacción
 * Dexie sobre la misma tabla serializa ambas escrituras, así que ya no
 * pueden pisarse.
 */
export async function ensureProfile(userId: string): Promise<void> {
  await db.transaction('rw', db.profile, async () => {
    const profile = await db.profile.get(userId)
    if (!profile) {
      // updatedAt/dirty los sella el hook `creating` de syncHooks.ts
      await db.profile.add({
        id: userId,
        units: 'kg',
        restTimerDefault: 90,
        onboardingComplete: 0,
        calorieTrackingEnabled: 1,
      } as LocalProfile)
    }
  })
}
