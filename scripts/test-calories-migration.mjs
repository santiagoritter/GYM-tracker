/**
 * Verifica la cadena v9 -> v10 (contador de calorías): la tabla nueva no
 * tiene datos que migrar, así que lo único que puede salir mal es que el
 * upgrade rompa algo de lo que YA estaba ahí. Se abre una DB en v9 con
 * datos reales, se reabre en v10 y se confirma que sobrevivió todo y que
 * calorieEntries quedó disponible y vacía.
 */
import 'fake-indexeddb/auto'
import Dexie from 'dexie'

const UID = '22222222-2222-4222-8222-222222222222'
const fail = []
const check = (cond, msg) => { if (!cond) fail.push(msg) }

const v9 = new Dexie('CaloriesMigrationDB')
v9.version(9).stores({
  routines: 'id, userId, isActive, isArchived, dirty',
  profile: 'id, dirty',
  tombstones: 'id, userId, tableName, dirty',
  syncState: 'key',
})
await v9.open()
await v9.profile.add({
  id: UID, units: 'kg', restTimerDefault: 90, bodyWeightKg: 75,
  dirty: 1, updatedAt: '2026-01-01T00:00:00Z',
})
await v9.routines.add({
  id: 'r1', userId: UID, name: 'PPL', color: '#E8FF47',
  isActive: 1, isArchived: 0, dirty: 0, updatedAt: '2026-01-01T00:00:00Z',
})
v9.close()

const v10 = new Dexie('CaloriesMigrationDB')
v10.version(9).stores({
  routines: 'id, userId, isActive, isArchived, dirty',
  profile: 'id, dirty',
  tombstones: 'id, userId, tableName, dirty',
  syncState: 'key',
})
v10.version(10).stores({
  calorieEntries: 'id, userId, loggedAt, dirty',
}).upgrade(async () => {
  // no-op deliberado — copia exacta del bloque real en src/db/schema.ts
})
await v10.open()

check(v10.verno === 10, `debería abrir en v10, abrió en v${v10.verno}`)
check((await v10.calorieEntries.count()) === 0, 'calorieEntries debería existir y estar vacía')

const profile = await v10.profile.get(UID)
check(profile?.bodyWeightKg === 75, 'el perfil preexistente no debería alterarse')

const routine = await v10.routines.get('r1')
check(routine?.isActive === 1, 'la rutina preexistente no debería alterarse')
check(routine?.dirty === 0, 'el upgrade de v10 no debería re-ensuciar filas que no tocó')

await v10.calorieEntries.add({
  id: 'c1', userId: UID, loggedAt: '2026-01-02T12:00:00Z', kcal: 450,
  dirty: 1, updatedAt: '2026-01-02T12:00:00Z',
})
check((await v10.calorieEntries.get('c1'))?.kcal === 450, 'la tabla nueva debería aceptar escrituras')

if (fail.length) {
  console.error('\n❌ FALLOS:')
  fail.forEach((f) => console.error('  - ' + f))
  process.exit(1)
}
console.log('✅ Migración v9 → v10 correcta: calorieEntries disponible, nada preexistente alterado.')
