/**
 * Prueba dedicada del paso de mayor riesgo de la migración a Supabase
 * Auth (Bloque 4 del plan): remapear TODO el userId local viejo al
 * auth.uid() nuevo la primera vez que una cuenta hace login real. Si
 * esto queda mal, no tira error — el historial simplemente desaparece
 * de la vista (src/db/scoped.ts filtra por userId) sin que se note hasta
 * mucho después. "Perder el historial de alguien no se deshace"
 * (CLAUDE.md) — por eso esto no se prueba solo con tsc/build.
 */
import 'fake-indexeddb/auto'
import { db } from '@/db/schema'
import { installSyncHooks, setSyncUser } from '@/db/syncHooks'
import { findRecoverableAccounts, migrateLocalUserToSupabase, remapUserData, retryPendingMigrations } from '@/db/migrateLocalUserToSupabase'
import { useAuthStore } from '@/stores/authStore'

const OLD_UID = '11111111-1111-4111-8111-111111111111'
const NEW_UID = '22222222-2222-4222-8222-222222222222'
const EMAIL = 'atleta@example.com'
const fail = []
const check = (cond, msg) => { if (!cond) fail.push(msg) }

installSyncHooks(db)
setSyncUser(OLD_UID)

// ── Cuenta local vieja (lo que dejaba el login 100% local) ─────────────────
await db.users.add({
  id: OLD_UID, email: EMAIL, passwordHash: 'x', salt: 'y', role: 'user',
  name: 'Atleta', createdAt: '2026-01-01T00:00:00Z', onboardingComplete: 1, emailVerified: 1,
})
await db.emailVerifications.add({
  id: OLD_UID, code: 'x', expiresAt: '2026-01-01T00:15:00Z', lastSentAt: '2026-01-01T00:00:00Z', attempts: 0,
})

// ── Una fila por cada tabla de SYNC_ORDER, todas bajo el id viejo ──────────
await db.profile.add({ id: OLD_UID, units: 'kg', restTimerDefault: 90, bodyWeightKg: 80 })
await db.routines.add({ id: 'r1', userId: OLD_UID, name: 'PPL', color: '#E8FF47', isActive: 1, isArchived: 0 })
await db.routineDays.add({ id: 'd1', routineId: 'r1', userId: OLD_UID, name: 'Push', dayOrder: 1, isRest: 0 })
await db.routineExercises.add({
  id: 're1', dayId: 'd1', userId: OLD_UID, exerciseId: 'bench-press',
  exerciseOrder: 1, setsTarget: 4, repsMin: 8, repsMax: 12, restSeconds: 90,
})
await db.workouts.add({
  id: 'w1', userId: OLD_UID, name: 'Push', startedAt: '2026-01-03T00:00:00Z', finishedAt: '2026-01-03T01:00:00Z',
})
await db.workoutSets.add({
  id: 's1', workoutId: 'w1', userId: OLD_UID, exerciseId: 'bench-press',
  setNumber: 1, reps: 10, weightKg: 60, isWarmup: 0, completed: 1,
})
await db.personalRecords.add({
  id: `${OLD_UID}_bench-press`, userId: OLD_UID, exerciseId: 'bench-press',
  weightKg: 60, reps: 10, oneRmKg: 80, achievedAt: '2026-01-03T01:00:00Z', workoutId: 'w1',
})
await db.bodyMeasurements.add({ id: 'm1', userId: OLD_UID, takenAt: '2026-01-01T00:00:00Z', weightKg: 80 })
await db.achievements.add({ id: 'a1', userId: OLD_UID, unlockedAt: '2026-01-01T00:00:00Z' })
await db.progressPhotos.add({
  id: 'p1', userId: OLD_UID, takenAt: '2026-01-01T00:00:00Z', blob: new Blob(['foto']), uploaded: 0,
})
await db.exercisePhotos.add({
  id: `${OLD_UID}_bench-press`, userId: OLD_UID, exerciseId: 'bench-press',
  blob: new Blob(['setup']), uploaded: 0, createdAt: '2026-01-01T00:00:00Z',
})
await db.calorieEntries.add({ id: 'c1', userId: OLD_UID, loggedAt: '2026-01-01T12:00:00Z', kcal: 500 })

// ── Un borrado pendiente de propagar, también bajo el id viejo ─────────────
await db.tombstones.put({
  id: 'w-old', tableName: 'workouts', userId: OLD_UID, deletedAt: '2026-01-02T00:00:00Z', dirty: 1,
})

// ── Login real con Supabase: remapear todo al uid nuevo ────────────────────
await migrateLocalUserToSupabase(NEW_UID, EMAIL)

// profile: la PK misma tiene que moverse
const newProfile = await db.profile.get(NEW_UID)
check(newProfile?.bodyWeightKg === 80, 'el perfil migrado perdió el peso corporal')
check(!(await db.profile.get(OLD_UID)), 'el perfil viejo debería haber desaparecido, no quedar duplicado')

// tablas con userId simple
const newRoutines = await db.routines.where('userId').equals(NEW_UID).toArray()
check(newRoutines.length === 1 && newRoutines[0]?.name === 'PPL', 'routines no se remapeó')
check((await db.routines.where('userId').equals(OLD_UID).toArray()).length === 0, 'quedó una rutina huérfana con el userId viejo')

const newDays = await db.routineDays.where('userId').equals(NEW_UID).toArray()
check(newDays.length === 1, 'routineDays no se remapeó')

const newExercises = await db.routineExercises.where('userId').equals(NEW_UID).toArray()
check(newExercises.length === 1, 'routineExercises no se remapeó')

const newWorkouts = await db.workouts.where('userId').equals(NEW_UID).toArray()
check(newWorkouts.length === 1, 'workouts no se remapeó')

const newSets = await db.workoutSets.where('userId').equals(NEW_UID).toArray()
check(newSets.length === 1, 'workoutSets no se remapeó')

const newMeasurements = await db.bodyMeasurements.where('userId').equals(NEW_UID).toArray()
check(newMeasurements.length === 1, 'bodyMeasurements no se remapeó')

const newAchievements = await db.achievements.where('userId').equals(NEW_UID).toArray()
check(newAchievements.length === 1, 'achievements no se remapeó')

const newCalories = await db.calorieEntries.where('userId').equals(NEW_UID).toArray()
check(newCalories.length === 1, 'calorieEntries no se remapeó')

// tablas con clave compuesta ${userId}_${exerciseId}
const newPr = await db.personalRecords.get(`${NEW_UID}_bench-press`)
check(newPr?.oneRmKg === 80, `personalRecords no quedó con la clave compuesta esperada ${NEW_UID}_bench-press`)
check(!(await db.personalRecords.get(`${OLD_UID}_bench-press`)), 'quedó un personalRecord huérfano con el id viejo')

const newExercisePhoto = await db.exercisePhotos.get(`${NEW_UID}_bench-press`)
check(newExercisePhoto?.blob instanceof Blob, 'exercisePhotos perdió el blob en el remapeo')
check((await newExercisePhoto?.blob?.text()) === 'setup', 'el contenido del blob de exercisePhotos cambió')

const newProgressPhotos = await db.progressPhotos.where('userId').equals(NEW_UID).toArray()
check(newProgressPhotos.length === 1 && newProgressPhotos[0]?.blob instanceof Blob, 'progressPhotos no se remapeó bien')

// tombstone
const newTombstones = await db.tombstones.where('userId').equals(NEW_UID).toArray()
check(newTombstones.length === 1 && newTombstones[0]?.id === 'w-old', 'el tombstone no se remapeó al userId nuevo')

// limpieza del registro de auth local viejo
check(!(await db.users.get(OLD_UID)), 'el usuario local viejo debería borrarse tras migrar')
check(!(await db.emailVerifications.get(OLD_UID)), 'la verificación de email vieja debería borrarse tras migrar')

// idempotencia: correrlo de nuevo (ya no hay legacy user con ese email) no debe tirar ni duplicar nada
await migrateLocalUserToSupabase(NEW_UID, EMAIL)
const routinesAfterSecondRun = await db.routines.where('userId').equals(NEW_UID).toArray()
check(routinesAfterSecondRun.length === 1, 'correr la migración dos veces no debería duplicar filas')

// ── Modo invitado: los datos de `guest-<uuid>` pasan a la cuenta real ──────
// (mismo remapeo, más las salidas a correr — que son solo locales, no están en
// SYNC_ORDER, y antes quedaban huérfanas).
const GUEST = 'guest-33333333-3333-4333-8333-333333333333'
const ACCOUNT = '44444444-4444-4444-8444-444444444444'
await db.profile.add({ id: GUEST, units: 'kg', restTimerDefault: 90, onboardingComplete: 1 })
await db.workouts.add({ id: 'gw1', userId: GUEST, name: 'Pierna', startedAt: '2026-02-01T00:00:00Z', finishedAt: '2026-02-01T01:00:00Z' })
await db.personalRecords.add({
  id: `${GUEST}_squat`, userId: GUEST, exerciseId: 'squat',
  weightKg: 100, reps: 5, oneRmKg: 115, achievedAt: '2026-02-01T01:00:00Z', workoutId: 'gw1',
})
await db.runs.add({
  id: 'run1', userId: GUEST, workoutId: 'gw1', startedAt: '2026-02-02T00:00:00Z', finishedAt: '2026-02-02T00:30:00Z',
  route: [{ lat: -34.6, lng: -58.4, t: 1 }],
  summary: { distanceM: 5000, durationSec: 1800, movingSec: 1800, avgPaceSecPerKm: 360, avgSpeedMs: 2.7, maxSpeedMs: 4, elevationGainM: 10, elevationLossM: 10, bestSplitSecPerKm: 350, kcal: 300 },
})
await remapUserData(GUEST, ACCOUNT)
check(!!(await db.profile.get(ACCOUNT)) && !(await db.profile.get(GUEST)), 'invitado: el perfil no pasó a la cuenta')
check((await db.workouts.where('userId').equals(ACCOUNT).toArray()).some((w) => w.id === 'gw1'), 'invitado: el entreno no pasó a la cuenta')
check((await db.workouts.where('userId').equals(GUEST).count()) === 0, 'invitado: quedó un entreno huérfano')
check(!!(await db.personalRecords.get(`${ACCOUNT}_squat`)) && !(await db.personalRecords.get(`${GUEST}_squat`)), 'invitado: el PR (clave compuesta) no se remapeó')
const guestRuns = await db.runs.where('userId').equals(ACCOUNT).toArray()
check(guestRuns.length === 1 && guestRuns[0]?.route.length === 1, 'invitado: la salida a correr y su recorrido no pasaron a la cuenta')
check((await db.runs.where('userId').equals(GUEST).count()) === 0, 'invitado: quedó una salida huérfana')
await remapUserData(GUEST, ACCOUNT) // idempotente: ya no hay nada bajo GUEST
check((await db.workouts.where('userId').equals(ACCOUNT).toArray()).filter((w) => w.id === 'gw1').length === 1, 'invitado: correr dos veces duplicó filas')

// ── Colisión: la cuenta real ya tiene filas con el mismo id destino ────────
// (perfil y PRs bajados del servidor antes de remapear). Antes el `put` las
// pisaba en silencio con el dato local viejo — así se perdía historial real.
const G2 = 'guest-55555555-5555-4555-8555-555555555555'
const REAL = '66666666-6666-4666-8666-666666666666'
await db.profile.put({ id: REAL, units: 'kg', restTimerDefault: 120, bodyWeightKg: 90, updatedAt: '2026-05-01T00:00:00Z', dirty: 0 })
await db.profile.put({ id: G2, units: 'kg', restTimerDefault: 60, bodyWeightKg: 70, updatedAt: '2026-01-01T00:00:00Z', dirty: 1 })
// PR real mejor que el local → se queda el real
await db.personalRecords.put({ id: `${REAL}_deadlift`, userId: REAL, exerciseId: 'deadlift', weightKg: 180, reps: 3, oneRmKg: 190, achievedAt: '2026-05-01T00:00:00Z', workoutId: 'x', updatedAt: '2026-05-01T00:00:00Z', dirty: 0 })
await db.personalRecords.put({ id: `${G2}_deadlift`, userId: G2, exerciseId: 'deadlift', weightKg: 140, reps: 3, oneRmKg: 150, achievedAt: '2026-01-01T00:00:00Z', workoutId: 'y', updatedAt: '2026-01-01T00:00:00Z', dirty: 1 })
// PR local mejor que el real → gana el local
await db.personalRecords.put({ id: `${REAL}_ohp`, userId: REAL, exerciseId: 'ohp', weightKg: 50, reps: 5, oneRmKg: 58, achievedAt: '2026-05-01T00:00:00Z', workoutId: 'x', updatedAt: '2026-05-01T00:00:00Z', dirty: 0 })
await db.personalRecords.put({ id: `${G2}_ohp`, userId: G2, exerciseId: 'ohp', weightKg: 60, reps: 5, oneRmKg: 70, achievedAt: '2026-01-01T00:00:00Z', workoutId: 'y', updatedAt: '2026-01-01T00:00:00Z', dirty: 1 })
// Fila que llega con dirty: 0 heredado: igual tiene que subir con su nuevo dueño
await db.workouts.put({ id: 'g2w', userId: G2, name: 'Push', startedAt: '2026-01-02T00:00:00Z', finishedAt: '2026-01-02T01:00:00Z', updatedAt: '2026-01-02T01:00:00Z', dirty: 0 })

await remapUserData(G2, REAL)
check((await db.profile.get(REAL))?.bodyWeightKg === 90, 'colisión: el perfil local viejo pisó al perfil real más nuevo')
check(!(await db.profile.get(G2)), 'colisión: quedó el perfil del invitado')
check((await db.personalRecords.get(`${REAL}_deadlift`))?.oneRmKg === 190, 'colisión: un PR local peor pisó al PR real')
check((await db.personalRecords.get(`${REAL}_ohp`))?.oneRmKg === 70, 'colisión: el PR local mejor no reemplazó al real')
check((await db.personalRecords.where('userId').equals(G2).count()) === 0, 'colisión: quedaron PRs huérfanos del invitado')
check((await db.workouts.get('g2w'))?.dirty === 1, 'una fila remapeada con dirty: 0 no se marcó para subir')

// ── Recuperación manual: qué historial ofrece reclamar ────────────────────
const OTHER_REAL = '77777777-7777-4777-8777-777777777777'
const G3 = 'guest-88888888-8888-4888-8888-888888888888'
await db.workouts.put({ id: 'ow', userId: OTHER_REAL, name: 'Ajeno', startedAt: '2026-03-01T00:00:00Z' })
await db.workouts.put({ id: 'g3w', userId: G3, name: 'Huérfano', startedAt: '2026-03-01T00:00:00Z' })
const recoverable = await findRecoverableAccounts(REAL)
check(recoverable.some((r) => r.id === G3 && r.workouts === 1), 'recuperación: no ofrece el historial del invitado huérfano')
check(!recoverable.some((r) => r.id === OTHER_REAL), 'recuperación: ofrece datos de OTRA cuenta real (de otra persona)')
check(!recoverable.some((r) => r.id === REAL), 'recuperación: se ofrece a sí misma')

// ── Reintento al arrancar: guestId pendiente en el store ──────────────────
useAuthStore.setState({ guestId: G3 })
await retryPendingMigrations(REAL, 'otra@example.com')
check((await db.workouts.get('g3w'))?.userId === REAL, 'reintento: el invitado pendiente no se migró al arrancar')
check(useAuthStore.getState().guestId === null, 'reintento: no limpió el guestId tras migrar')
await retryPendingMigrations(REAL, 'otra@example.com') // no-op
check((await db.workouts.where('userId').equals(REAL).count()) === 2, 'reintento: correrlo dos veces cambió algo')

if (fail.length) {
  console.error('\n❌ FALLOS:')
  fail.forEach((f) => console.error('  - ' + f))
  process.exit(1)
}
console.log('✅ Remapeo de userId local → Supabase Auth correcto: sin filas huérfanas, sin duplicados, claves compuestas y blobs intactos.')
