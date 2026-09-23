/**
 * `wipeLocalData` (deleteAccount.ts) borra "el resto local" al dar de baja
 * la cuenta o al descartar el modo invitado. Hasta esta tanda era
 * `db.delete()` — TODA la base del dispositivo, sin importar de quién era
 * cada fila. En un teléfono con más de una cuenta (o un invitado que
 * después probó una cuenta real), borrar una se llevaba puesto lo que no
 * había sincronizado de la otra, sin aviso y sin vuelta atrás — "perder el
 * historial de alguien no se deshace" (CLAUDE.md). Esta prueba siembra DOS
 * cuentas con una fila en cada tabla de SYNC_ORDER + runs + tombstones +
 * cursores de sync, borra una sola, y verifica que la otra sigue intacta.
 */
import 'fake-indexeddb/auto'
import { db } from '@/db/schema'
import { installSyncHooks, setSyncUser } from '@/db/syncHooks'
import { wipeLocalData } from '@/lib/deleteAccount'

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const fail: string[] = []
const check = (cond: boolean, msg: string) => { if (!cond) fail.push(msg) }

installSyncHooks(db)
setSyncUser(A)

async function seed(uid: string, tag: string) {
  await db.profile.add({ id: uid, units: 'kg', restTimerDefault: 90, bodyWeightKg: 80 })
  await db.routines.add({ id: `r-${tag}`, userId: uid, name: 'PPL', color: '#E8FF47', isActive: 1, isArchived: 0 })
  await db.routineDays.add({ id: `d-${tag}`, routineId: `r-${tag}`, userId: uid, name: 'Push', dayOrder: 1, isRest: 0 })
  await db.routineExercises.add({
    id: `re-${tag}`, dayId: `d-${tag}`, userId: uid, exerciseId: 'bench-press',
    exerciseOrder: 1, setsTarget: 4, repsMin: 8, repsMax: 12, restSeconds: 90,
  })
  await db.workouts.add({
    id: `w-${tag}`, userId: uid, name: 'Push', startedAt: '2026-01-03T00:00:00Z', finishedAt: '2026-01-03T01:00:00Z',
  })
  await db.workoutSets.add({
    id: `s-${tag}`, workoutId: `w-${tag}`, userId: uid, exerciseId: 'bench-press',
    setNumber: 1, reps: 10, weightKg: 60, isWarmup: 0, completed: 1,
  })
  await db.personalRecords.add({
    id: `${uid}_bench-press`, userId: uid, exerciseId: 'bench-press',
    weightKg: 60, reps: 10, oneRmKg: 80, achievedAt: '2026-01-03T01:00:00Z', workoutId: `w-${tag}`,
  })
  await db.bodyMeasurements.add({ id: `m-${tag}`, userId: uid, takenAt: '2026-01-01T00:00:00Z', weightKg: 80 })
  await db.achievements.add({ id: `a-${tag}`, userId: uid, unlockedAt: '2026-01-01T00:00:00Z' })
  await db.progressPhotos.add({
    id: `p-${tag}`, userId: uid, takenAt: '2026-01-01T00:00:00Z', blob: new Blob(['foto']), uploaded: 0,
  })
  await db.exercisePhotos.add({
    id: `${uid}_bench-press`, userId: uid, exerciseId: 'bench-press',
    blob: new Blob(['setup']), uploaded: 0, createdAt: '2026-01-01T00:00:00Z',
  })
  await db.calorieEntries.add({ id: `c-${tag}`, userId: uid, loggedAt: '2026-01-01T12:00:00Z', kcal: 500 })
  await db.restLogs.add({
    id: `rl-${tag}`, userId: uid, workoutId: `w-${tag}`, exerciseId: 'bench-press',
    plannedSeconds: 90, actualSeconds: 95, discarded: 0, loggedAt: '2026-01-03T00:30:00Z',
  })
  await db.notifications.add({
    id: `n-${tag}`, userId: uid, type: 'pr', title: 'PR', body: 'Nuevo PR', read: 0, createdAt: '2026-01-03T01:00:00Z',
  })
  await db.runs.add({
    id: `run-${tag}`, userId: uid, workoutId: `w-${tag}`,
    startedAt: '2026-01-04T00:00:00Z', finishedAt: '2026-01-04T00:30:00Z',
    route: [], summary: { distanceM: 5000, durationS: 1800, avgPaceSPerKm: 360, elevationGainM: 0, kcal: 300 },
  })
  await db.tombstones.put({
    id: `t-${tag}`, tableName: 'workouts', userId: uid, deletedAt: '2026-01-02T00:00:00Z', dirty: 1,
  })
  await db.syncState.put({ key: `pull_${uid}_workouts`, value: '2026-01-01T00:00:00Z' })
}

// Catálogo global, sin dueño — tiene que sobrevivir a cualquier borrado.
await db.exercises.add({
  id: 'bench-press', name: 'Press de banca', equipment: 'barbell', pattern: 'push',
  musclePrimary: ['chest'], muscleSecondary: [], difficulty: 'intermediate', unilateral: 0,
} as never)

await seed(A, 'a')
await seed(B, 'b')

await wipeLocalData(A)

// ── A: todo tiene que haber desaparecido ────────────────────────────────
check(!(await db.profile.get(A)), 'profile de A sigue después de wipeLocalData(A)')
check((await db.routines.where('userId').equals(A).count()) === 0, 'routines de A sigue')
check((await db.routineDays.where('userId').equals(A).count()) === 0, 'routineDays de A sigue')
check((await db.routineExercises.where('userId').equals(A).count()) === 0, 'routineExercises de A sigue')
check((await db.workouts.where('userId').equals(A).count()) === 0, 'workouts de A sigue')
check((await db.workoutSets.where('userId').equals(A).count()) === 0, 'workoutSets de A sigue')
check(!(await db.personalRecords.get(`${A}_bench-press`)), 'personalRecords de A sigue')
check((await db.bodyMeasurements.where('userId').equals(A).count()) === 0, 'bodyMeasurements de A sigue')
check((await db.achievements.where('userId').equals(A).count()) === 0, 'achievements de A sigue')
check((await db.progressPhotos.where('userId').equals(A).count()) === 0, 'progressPhotos de A sigue')
check(!(await db.exercisePhotos.get(`${A}_bench-press`)), 'exercisePhotos de A sigue')
check((await db.calorieEntries.where('userId').equals(A).count()) === 0, 'calorieEntries de A sigue')
check((await db.restLogs.where('userId').equals(A).count()) === 0, 'restLogs de A sigue')
check((await db.notifications.where('userId').equals(A).count()) === 0, 'notifications de A sigue')
check((await db.runs.where('userId').equals(A).count()) === 0, 'runs de A sigue')
check((await db.tombstones.where('userId').equals(A).count()) === 0, 'tombstones de A sigue')
check(!(await db.syncState.get(`pull_${A}_workouts`)), 'cursor de sync de A sigue')

// ── B: nada se tiene que haber tocado ───────────────────────────────────
check((await db.profile.get(B))?.bodyWeightKg === 80, 'profile de B se perdió o cambió')
check((await db.routines.where('userId').equals(B).count()) === 1, 'routines de B se perdió')
check((await db.routineDays.where('userId').equals(B).count()) === 1, 'routineDays de B se perdió')
check((await db.routineExercises.where('userId').equals(B).count()) === 1, 'routineExercises de B se perdió')
check((await db.workouts.where('userId').equals(B).count()) === 1, 'workouts de B se perdió')
check((await db.workoutSets.where('userId').equals(B).count()) === 1, 'workoutSets de B se perdió')
check((await db.personalRecords.get(`${B}_bench-press`))?.oneRmKg === 80, 'personalRecords de B se perdió')
check((await db.bodyMeasurements.where('userId').equals(B).count()) === 1, 'bodyMeasurements de B se perdió')
check((await db.achievements.where('userId').equals(B).count()) === 1, 'achievements de B se perdió')
check((await db.progressPhotos.where('userId').equals(B).count()) === 1, 'progressPhotos de B se perdió')
const bPhoto = await db.exercisePhotos.get(`${B}_bench-press`)
check(bPhoto?.blob instanceof Blob && (await bPhoto.blob.text()) === 'setup', 'exercisePhotos de B se perdió o cambió')
check((await db.calorieEntries.where('userId').equals(B).count()) === 1, 'calorieEntries de B se perdió')
check((await db.restLogs.where('userId').equals(B).count()) === 1, 'restLogs de B se perdió')
check((await db.notifications.where('userId').equals(B).count()) === 1, 'notifications de B se perdió')
check((await db.runs.where('userId').equals(B).count()) === 1, 'runs de B se perdió')
check((await db.tombstones.where('userId').equals(B).count()) === 1, 'tombstones de B se perdió')
check((await db.syncState.get(`pull_${B}_workouts`))?.value === '2026-01-01T00:00:00Z', 'cursor de sync de B se perdió')

// ── Catálogo global: no tiene dueño, tiene que sobrevivir siempre ──────────
check(!!(await db.exercises.get('bench-press')), 'el catálogo de ejercicios (sin dueño) se borró — no debería')

if (fail.length) {
  console.error(`\n❌ ${fail.length} problema(s) en wipeLocalData:`)
  fail.forEach((f) => console.error('  - ' + f))
  process.exit(1)
}
console.log('✅ wipeLocalData: borra solo la cuenta indicada, no toca otra cuenta ni el catálogo.')
