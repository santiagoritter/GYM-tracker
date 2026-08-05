/**
 * Prueba de ida y vuelta de exportBackup/importBackup (Fase 19): lo más
 * riesgoso no es la serialización, es el remapeo de userId — en particular
 * los ids compuestos de personalRecords/exercisePhotos y el PK de profile.
 * Si eso queda mal, el import "funciona" (no tira error) pero deja datos
 * huérfanos o pisa lo que no debía.
 */
import 'fake-indexeddb/auto'
import { db } from '@/db/schema'
import { installSyncHooks, setSyncUser } from '@/db/syncHooks'
import { exportBackup, importBackup } from '@/lib/backup'

const OLD_UID = '11111111-1111-4111-8111-111111111111'
const NEW_UID = '22222222-2222-4222-8222-222222222222'
const fail: string[] = []
const check = (cond: boolean, msg: string) => { if (!cond) fail.push(msg) }

installSyncHooks(db)
setSyncUser(OLD_UID)

await db.profile.add({
  id: OLD_UID, units: 'kg', restTimerDefault: 90, bodyWeightKg: 80,
} as never)
await db.routines.add({
  id: 'r1', userId: OLD_UID, name: 'PPL', color: '#E8FF47', isActive: 1, isArchived: 0,
} as never)
await db.routineDays.add({
  id: 'd1', routineId: 'r1', userId: OLD_UID, name: 'Push', dayOrder: 1, isRest: 0,
} as never)
await db.workouts.add({
  id: 'w1', userId: OLD_UID, name: 'Push', startedAt: '2026-01-03T00:00:00Z',
  finishedAt: '2026-01-03T01:00:00Z',
} as never)
await db.workoutSets.add({
  id: 's1', workoutId: 'w1', userId: OLD_UID, exerciseId: 'bench-press',
  setNumber: 1, reps: 10, weightKg: 60, isWarmup: 0, completed: 1,
} as never)
await db.personalRecords.add({
  id: `${OLD_UID}_bench-press`, userId: OLD_UID, exerciseId: 'bench-press',
  weightKg: 60, reps: 10, oneRmKg: 80, achievedAt: '2026-01-03T01:00:00Z', workoutId: 'w1',
} as never)
await db.exercisePhotos.add({
  id: `${OLD_UID}_bench-press`, userId: OLD_UID, exerciseId: 'bench-press',
  blob: new Blob(['foto']), uploaded: 0, createdAt: '2026-01-03T00:00:00Z',
} as never)

// ── Export bajo el usuario viejo ────────────────────────────────────────────
const blob = await exportBackup(OLD_UID)
const json = await blob.text()
const parsed = JSON.parse(json)
check(parsed.v === 1, 'el backup debería declarar v: 1')
check(Array.isArray(parsed.tables.routines) && parsed.tables.routines.length === 1, 'faltó la rutina en el export')
check(
  parsed.tables.exercisePhotos[0].blobBase64 !== undefined,
  'el blob de exercisePhotos debería venir codificado a base64, no como Blob crudo'
)

// ── Import bajo un usuario nuevo (simula "cambié de dispositivo") ──────────
setSyncUser(NEW_UID)
await importBackup(NEW_UID, json)

const newProfile = await db.profile.get(NEW_UID)
check(newProfile?.bodyWeightKg === 80, 'el perfil importado perdió el peso corporal')
check(newProfile?.id === NEW_UID, 'profile.id debería ser el userId nuevo, no el viejo')

const newRoutines = await db.routines.where('userId').equals(NEW_UID).toArray()
check(newRoutines.length === 1 && newRoutines[0]?.name === 'PPL', 'la rutina no se importó con el userId nuevo')

const newPr = await db.personalRecords.get(`${NEW_UID}_bench-press`)
check(newPr?.oneRmKg === 80, `personalRecords no se remapeó bien: id compuesto esperado ${NEW_UID}_bench-press`)
const oldPrStillThere = await db.personalRecords.get(`${OLD_UID}_bench-press`)
check(Boolean(oldPrStillThere), 'el import no debería borrar los datos originales del usuario viejo')

const newPhoto = await db.exercisePhotos.get(`${NEW_UID}_bench-press`)
check(newPhoto?.blob instanceof Blob, 'el blob de la foto no se decodificó de vuelta al importar')
check(
  (await newPhoto?.blob?.text()) === 'foto',
  'el contenido del blob cambió en el viaje de ida y vuelta'
)

if (fail.length) {
  console.error('\n❌ FALLOS:')
  fail.forEach((f) => console.error('  - ' + f))
  process.exit(1)
}
console.log('✅ Backup: export/import con remapeo de userId correcto, incluidos ids compuestos y blobs.')
