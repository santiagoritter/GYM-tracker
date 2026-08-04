/**
 * Verifica la cadena de upgrades v8 -> v9 con datos reales.
 * Simula una instalación existente (esquema v8, con `synced`, sin `userId`
 * en las hijas, con onboardingComplete en `users`) y comprueba que después
 * de abrir con el esquema v9 no se perdió nada y todo quedó bien sellado.
 */
import 'fake-indexeddb/auto'
import Dexie from 'dexie'

const UID = '11111111-1111-4111-8111-111111111111'
const fail = []
const check = (cond, msg) => { if (!cond) fail.push(msg) }

// ── 1. Crear una DB con el esquema v8 exacto y datos ───────────────────────
const old = new Dexie('GymTrackerDB')
old.version(8).stores({
  workouts: 'id, userId, startedAt, finishedAt, synced',
  workoutSets: 'id, workoutId, exerciseId, synced, [workoutId+exerciseId]',
  exercises: 'id, equipment, pattern, *musclePrimary',
  personalRecords: 'id, userId, exerciseId',
  profile: 'id',
  routines: 'id, userId, isActive, isArchived',
  routineDays: 'id, routineId, dayOrder',
  routineExercises: 'id, dayId, exerciseOrder',
  progressPhotos: 'id, userId, takenAt',
  users: 'id, email, role',
  bodyMeasurements: 'id, userId, takenAt',
  achievements: 'id, userId, unlockedAt',
  emailVerifications: 'id',
  exercisePhotos: 'id, userId, exerciseId, [userId+exerciseId]',
})
await old.open()

await old.users.add({
  id: UID, email: 'santiagoritter26@gmail.com', passwordHash: 'x', salt: 'y',
  role: 'admin', name: 'Santi', createdAt: '2026-01-01T00:00:00Z',
  onboardingComplete: 1, emailVerified: 1,
})
await old.profile.add({ id: UID, units: 'kg', restTimerDefault: 90, bodyWeightKg: 75 })
await old.routines.add({
  id: 'r1', userId: UID, name: 'PPL', color: '#E8FF47',
  isActive: 1, isArchived: 0, synced: 0, updatedAt: '2026-01-02T00:00:00Z',
})
await old.routineDays.add({ id: 'd1', routineId: 'r1', name: 'Push', dayOrder: 1, isRest: 0 })
await old.routineExercises.add({
  id: 'e1', dayId: 'd1', exerciseId: 'bench-press', exerciseOrder: 1,
  setsTarget: 3, repsMin: 8, repsMax: 12, restSeconds: 90,
})
await old.workouts.add({
  id: 'w1', userId: UID, name: 'Push', startedAt: '2026-01-03T00:00:00Z',
  finishedAt: '2026-01-03T01:00:00Z', synced: 1, updatedAt: '2026-01-03T01:00:00Z',
})
await old.workoutSets.add({
  id: 's1', workoutId: 'w1', exerciseId: 'bench-press', setNumber: 1,
  reps: 10, weightKg: 60, isWarmup: 0, completed: 1, synced: 1,
  updatedAt: '2026-01-03T01:00:00Z',
})
await old.personalRecords.add({
  id: `${UID}_bench-press`, userId: UID, exerciseId: 'bench-press',
  weightKg: 60, reps: 10, oneRmKg: 80, achievedAt: '2026-01-03T01:00:00Z', workoutId: 'w1',
})
await old.bodyMeasurements.add({ id: 'm1', userId: UID, takenAt: '2026-01-04T00:00:00Z', weightKg: 75 })
await old.achievements.add({ id: `${UID}_first-workout`, userId: UID, unlockedAt: '2026-01-03T01:00:00Z' })
await old.progressPhotos.add({
  id: 'p1', userId: UID, takenAt: '2026-01-05T00:00:00Z', blob: new Blob(['x']),
})
old.close()

// ── 2. Reabrir con el esquema v9 (copia literal de src/db/schema.ts) ───────
const SYNC_ORDER = [
  'profile', 'routines', 'routineDays', 'routineExercises', 'workouts',
  'workoutSets', 'personalRecords', 'bodyMeasurements', 'achievements',
  'progressPhotos', 'exercisePhotos',
]

const db = new Dexie('GymTrackerDB')
db.version(8).stores({
  workouts: 'id, userId, startedAt, finishedAt, synced',
  workoutSets: 'id, workoutId, exerciseId, synced, [workoutId+exerciseId]',
  exercises: 'id, equipment, pattern, *musclePrimary',
  personalRecords: 'id, userId, exerciseId',
  profile: 'id',
  routines: 'id, userId, isActive, isArchived',
  routineDays: 'id, routineId, dayOrder',
  routineExercises: 'id, dayId, exerciseOrder',
  progressPhotos: 'id, userId, takenAt',
  users: 'id, email, role',
  bodyMeasurements: 'id, userId, takenAt',
  achievements: 'id, userId, unlockedAt',
  emailVerifications: 'id',
  exercisePhotos: 'id, userId, exerciseId, [userId+exerciseId]',
})
db.version(9).stores({
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

  const routineUser = new Map((await tx.table('routines').toArray()).map((r) => [r.id, r.userId]))
  const dayUser = new Map()
  await tx.table('routineDays').toCollection().modify((d) => {
    d.userId = routineUser.get(d.routineId) ?? ''
    dayUser.set(d.id, d.userId)
  })
  await tx.table('routineExercises').toCollection().modify((e) => {
    e.userId = dayUser.get(e.dayId) ?? ''
  })
  const workoutUser = new Map((await tx.table('workouts').toArray()).map((w) => [w.id, w.userId]))
  await tx.table('workoutSets').toCollection().modify((s) => {
    s.userId = workoutUser.get(s.workoutId) ?? ''
  })

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

  const users = await tx.table('users').toArray()
  for (const u of users) {
    const profile = await tx.table('profile').get(u.id)
    if (profile) {
      await tx.table('profile').update(u.id, { onboardingComplete: u.onboardingComplete ?? 0 })
    }
  }
})

await db.open()
console.log(`DB abierta en versión ${db.verno}`)

// ── 3. Aserciones ──────────────────────────────────────────────────────────
const day = await db.routineDays.get('d1')
check(day?.userId === UID, `routineDays.userId backfill falló: ${day?.userId}`)

const entry = await db.routineExercises.get('e1')
check(entry?.userId === UID, `routineExercises.userId backfill falló: ${entry?.userId}`)

const set = await db.workoutSets.get('s1')
check(set?.userId === UID, `workoutSets.userId backfill falló: ${set?.userId}`)
check(set?.dirty === 1, 'workoutSets.dirty debería ser 1')
check(set?.synced === undefined, 'workoutSets.synced debería haberse borrado')
check(set?.weightKg === 60 && set?.reps === 10, 'se perdieron datos de la serie')

const routine = await db.routines.get('r1')
check(routine?.dirty === 1, 'routines.dirty debería ser 1')
check(routine?.updatedAt === '2026-01-02T00:00:00Z', 'no debía pisarse un updatedAt existente')
check(routine?.isActive === 1, 'se perdió la rutina favorita')

const profile = await db.profile.get(UID)
check(profile?.onboardingComplete === 1, `onboardingComplete no migró: ${profile?.onboardingComplete}`)
check(profile?.bodyWeightKg === 75, 'se perdió el peso corporal del perfil')
check(profile?.dirty === 1, 'profile.dirty debería ser 1')
check(typeof profile?.updatedAt === 'string', 'profile.updatedAt debería haberse generado')

const pr = await db.personalRecords.get(`${UID}_bench-press`)
check(pr?.oneRmKg === 80 && pr?.dirty === 1, 'PR mal migrado')

const photo = await db.progressPhotos.get('p1')
check(photo?.uploaded === 0, 'progressPhotos.uploaded debería ser 0')
check(photo?.blob instanceof Blob, 'se perdió el blob de la foto')

const measurement = await db.bodyMeasurements.get('m1')
check(measurement?.weightKg === 75 && measurement?.dirty === 1, 'medida mal migrada')

const achievement = await db.achievements.get(`${UID}_first-workout`)
check(achievement?.dirty === 1, 'logro mal migrado')

// Las tablas nuevas deben existir y estar vacías
check((await db.tombstones.count()) === 0, 'tombstones debería existir y estar vacía')
check((await db.syncState.count()) === 0, 'syncState debería existir y estar vacía')

// El índice `dirty` debe ser consultable (es la query del pusher)
const dirtyRoutines = await db.routines.where('dirty').equals(1).count()
check(dirtyRoutines === 1, `query por índice dirty falló: ${dirtyRoutines}`)

// La tabla users sigue existiendo (se elimina recién en v10)
check((await db.users.count()) === 1, 'users no debería haberse borrado todavía')

if (fail.length) {
  console.error('\n❌ FALLOS:')
  fail.forEach((f) => console.error('  - ' + f))
  process.exit(1)
}
console.log('✅ Migración v8 → v9 correcta: nada perdido, todo sellado.')
