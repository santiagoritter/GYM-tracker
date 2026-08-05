/**
 * Verifica la cadena v10 -> v11 (bodyFatPct opcional en el perfil): campo
 * no indexado, .stores() no cambia — lo único que puede salir mal es que
 * el upgrade rompa algo de lo que YA estaba en el perfil.
 */
import 'fake-indexeddb/auto'
import Dexie from 'dexie'

const UID = '33333333-3333-4333-8333-333333333333'
const fail = []
const check = (cond, msg) => { if (!cond) fail.push(msg) }

const v10 = new Dexie('BodyFatMigrationDB')
v10.version(10).stores({
  profile: 'id, dirty',
  calorieEntries: 'id, userId, loggedAt, dirty',
})
await v10.open()
await v10.profile.add({
  id: UID, units: 'kg', restTimerDefault: 90, bodyWeightKg: 75, weeklyGoal: 4,
  dirty: 0, updatedAt: '2026-01-01T00:00:00Z',
})
v10.close()

const v11 = new Dexie('BodyFatMigrationDB')
v11.version(10).stores({
  profile: 'id, dirty',
  calorieEntries: 'id, userId, loggedAt, dirty',
})
v11.version(11).stores({}).upgrade(async () => {
  // no-op deliberado — copia exacta del bloque real en src/db/schema.ts
})
await v11.open()

check(v11.verno === 11, `debería abrir en v11, abrió en v${v11.verno}`)

const profile = await v11.profile.get(UID)
check(profile?.bodyWeightKg === 75, 'el peso corporal preexistente no debería alterarse')
check(profile?.weeklyGoal === 4, 'otros campos del perfil no deberían alterarse')
check(profile?.bodyFatPct === undefined, 'bodyFatPct no debería tener un valor inventado por el upgrade')
check(profile?.dirty === 0, 'el upgrade de v11 no debería re-ensuciar filas que no tocó')

await v11.profile.update(UID, { bodyFatPct: 18.5 })
check((await v11.profile.get(UID))?.bodyFatPct === 18.5, 'el perfil debería aceptar escrituras de bodyFatPct')

if (fail.length) {
  console.error('\n❌ FALLOS:')
  fail.forEach((f) => console.error('  - ' + f))
  process.exit(1)
}
console.log('✅ Migración v10 → v11 correcta: bodyFatPct disponible, nada preexistente alterado.')
