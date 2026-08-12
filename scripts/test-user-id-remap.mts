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
import { migrateLocalUserToSupabase } from '@/db/migrateLocalUserToSupabase'

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

if (fail.length) {
  console.error('\n❌ FALLOS:')
  fail.forEach((f) => console.error('  - ' + f))
  process.exit(1)
}
console.log('✅ Remapeo de userId local → Supabase Auth correcto: sin filas huérfanas, sin duplicados, claves compuestas y blobs intactos.')
