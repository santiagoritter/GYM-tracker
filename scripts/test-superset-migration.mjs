/**
 * Verifica la cadena v11 -> v12: fix del bug real donde src/lib/sync.ts
 * escribía `null` (NULL de Postgres) en vez de `undefined` para
 * supersetGroup — como todo el código lo compara con `!== undefined`
 * (nunca `== null`), y `null === null` entre filas de ejercicios
 * distintos, cualquier ejercicio sincronizado terminaba "en superserie"
 * con cualquier otro, bloqueando el descanso entre series. Este test
 * confirma que el upgrade limpia supersetGroup: null → undefined sin
 * tocar los grupos reales ni ningún otro campo.
 */
import 'fake-indexeddb/auto'
import Dexie from 'dexie'

const UID = '44444444-4444-4444-8444-444444444444'
const fail = []
const check = (cond, msg) => { if (!cond) fail.push(msg) }

const v11 = new Dexie('SupersetMigrationDB')
v11.version(9).stores({
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
})
v11.version(10).stores({ calorieEntries: 'id, userId, loggedAt, dirty' })
v11.version(11).stores({})
await v11.open()

// Set con grupo REAL (superserie de verdad, tiene que sobrevivir intacto).
await v11.routineExercises.add({
  id: 're-real', dayId: 'd1', userId: UID, exerciseOrder: 1,
  setsTarget: 4, repsMin: 8, repsMax: 12, restSeconds: 90,
  supersetGroup: 2, dirty: 0, updatedAt: '2026-01-01T00:00:00Z',
})
// Set nunca vinculado, nunca sincronizado (clave ausente de verdad).
await v11.routineExercises.add({
  id: 're-none', dayId: 'd1', userId: UID, exerciseOrder: 2,
  setsTarget: 3, repsMin: 8, repsMax: 12, restSeconds: 90,
  dirty: 0, updatedAt: '2026-01-01T00:00:00Z',
})
// Set corrompido por el bug: pulleó del servidor y quedó en null.
await v11.routineExercises.add({
  id: 're-null', dayId: 'd1', userId: UID, exerciseOrder: 3,
  setsTarget: 3, repsMin: 8, repsMax: 12, restSeconds: 90,
  supersetGroup: null, dirty: 0, updatedAt: '2026-01-01T00:00:00Z',
})

await v11.workoutSets.add({
  id: 'ws-real', workoutId: 'w1', userId: UID, exerciseId: 'ex1', setNumber: 1,
  reps: 10, weightKg: 50, isWarmup: 0, completed: 0,
  supersetGroup: 2, dirty: 0, updatedAt: '2026-01-01T00:00:00Z',
})
await v11.workoutSets.add({
  id: 'ws-null', workoutId: 'w1', userId: UID, exerciseId: 'ex2', setNumber: 1,
  reps: 10, weightKg: 50, isWarmup: 0, completed: 0,
  supersetGroup: null, dirty: 0, updatedAt: '2026-01-01T00:00:00Z',
})
v11.close()

const v12 = new Dexie('SupersetMigrationDB')
v12.version(9).stores({
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
})
v12.version(10).stores({ calorieEntries: 'id, userId, loggedAt, dirty' })
v12.version(11).stores({})
v12.version(12).stores({}).upgrade(async (tx) => {
  // copia exacta del bloque real en src/db/schema.ts
  await tx.table('workoutSets').toCollection()
    .filter((s) => s.supersetGroup === null)
    .modify({ supersetGroup: undefined })
  await tx.table('routineExercises').toCollection()
    .filter((e) => e.supersetGroup === null)
    .modify({ supersetGroup: undefined })
})
await v12.open()

check(v12.verno === 12, `debería abrir en v12, abrió en v${v12.verno}`)

const real = await v12.routineExercises.get('re-real')
check(real?.supersetGroup === 2, 'un grupo real de superserie no debería tocarse')

const none = await v12.routineExercises.get('re-none')
check(none?.supersetGroup === undefined, 'un ejercicio nunca vinculado debería seguir undefined')

const wasNull = await v12.routineExercises.get('re-null')
check(
  wasNull?.supersetGroup === undefined,
  `re-null debería quedar undefined, quedó ${JSON.stringify(wasNull?.supersetGroup)}`
)
check(wasNull?.setsTarget === 3, 'el resto de los campos de re-null no debería alterarse')

const wsReal = await v12.workoutSets.get('ws-real')
check(wsReal?.supersetGroup === 2, 'un grupo real en workoutSets no debería tocarse')

const wsWasNull = await v12.workoutSets.get('ws-null')
check(
  wsWasNull?.supersetGroup === undefined,
  `ws-null debería quedar undefined, quedó ${JSON.stringify(wsWasNull?.supersetGroup)}`
)
check(wsWasNull?.weightKg === 50, 'el resto de los campos de ws-null no debería alterarse')

if (fail.length) {
  console.error('\n❌ FALLOS:')
  fail.forEach((f) => console.error('  - ' + f))
  process.exit(1)
}
console.log('✅ Migración v11 → v12 correcta: supersetGroup null → undefined, grupos reales intactos.')
