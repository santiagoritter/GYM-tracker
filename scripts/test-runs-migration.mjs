/**
 * Verifica la cadena v12 -> v13 (salidas a correr con GPS): la tabla `runs`
 * es nueva, sin datos que migrar, así que lo único que puede salir mal es
 * que el upgrade rompa algo de lo que YA estaba. Se abre una DB en v12 con
 * datos reales, se reabre en v13 y se confirma que sobrevivió todo y que
 * `runs` quedó disponible, vacía y con el índice `dirty` consultable.
 */
import 'fake-indexeddb/auto'
import Dexie from 'dexie'

const UID = '33333333-3333-4333-8333-333333333333'
const fail = []
const check = (cond, msg) => { if (!cond) fail.push(msg) }

const V12_STORES = {
  routines: 'id, userId, isActive, isArchived, dirty',
  workouts: 'id, userId, startedAt, finishedAt, dirty',
  profile: 'id, dirty',
  calorieEntries: 'id, userId, loggedAt, dirty',
  tombstones: 'id, userId, tableName, dirty',
  syncState: 'key',
}

const v12 = new Dexie('RunsMigrationDB')
v12.version(12).stores(V12_STORES)
await v12.open()
await v12.profile.add({
  id: UID, units: 'kg', restTimerDefault: 90, bodyWeightKg: 72,
  dirty: 1, updatedAt: '2026-01-01T00:00:00Z',
})
await v12.workouts.add({
  id: 'w1', userId: UID, name: 'Full body', startedAt: '2026-01-01T10:00:00Z',
  finishedAt: '2026-01-01T11:00:00Z', dirty: 0, updatedAt: '2026-01-01T11:00:00Z',
})
v12.close()

const v13 = new Dexie('RunsMigrationDB')
v13.version(12).stores(V12_STORES)
v13.version(13).stores({
  runs: 'id, userId, workoutId, startedAt, dirty',
}).upgrade(async () => {
  // no-op deliberado — copia exacta del bloque real en src/db/schema.ts
})
await v13.open()

check(v13.verno === 13, `debería abrir en v13, abrió en v${v13.verno}`)
check((await v13.runs.count()) === 0, 'runs debería existir y estar vacía')

const profile = await v13.profile.get(UID)
check(profile?.bodyWeightKg === 72, 'el perfil preexistente no debería alterarse')
const workout = await v13.workouts.get('w1')
check(workout?.finishedAt === '2026-01-01T11:00:00Z', 'el workout preexistente no debería alterarse')
check(workout?.dirty === 0, 'el upgrade de v13 no debería re-ensuciar filas que no tocó')

await v13.runs.add({
  id: 'run1', userId: UID, workoutId: 'w1',
  startedAt: '2026-01-02T08:00:00Z', finishedAt: '2026-01-02T08:30:00Z',
  route: [{ lat: -34.6, lng: -58.4, t: 1 }, { lat: -34.601, lng: -58.401, t: 2000 }],
  summary: {
    distanceM: 5000, durationSec: 1800, movingSec: 1750, avgPaceSecPerKm: 360,
    avgSpeedMs: 2.78, maxSpeedMs: 3.5, elevationGainM: 12, elevationLossM: 10,
    bestSplitSecPerKm: 350, kcal: 320,
  },
  dirty: 1, updatedAt: '2026-01-02T08:30:00Z',
})
const run = await v13.runs.get('run1')
check(run?.summary?.distanceM === 5000, 'la tabla runs debería aceptar escrituras con route/summary')
check(run?.route?.length === 2, 'el route debería guardarse entero')

const dirtyRuns = await v13.runs.where('dirty').equals(1).count()
check(dirtyRuns === 1, `query por índice dirty en runs falló: ${dirtyRuns}`)

if (fail.length) {
  console.error('\n❌ FALLOS:')
  fail.forEach((f) => console.error('  - ' + f))
  process.exit(1)
}
console.log('✅ Migración v12 → v13 correcta: runs disponible, índice dirty OK, nada preexistente alterado.')
