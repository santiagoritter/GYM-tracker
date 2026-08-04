/**
 * Verifica los hooks de sellado y el escape anti-loop.
 *
 * El riesgo que cubre: el pusher baja `dirty` a 0 tras subir una fila; si el
 * hook `updating` vuelve a ponerlo en 1, la fila se re-sube para siempre.
 */
import 'fake-indexeddb/auto'
import Dexie from 'dexie'

const UID = 'user-1'
const fail = []
const check = (cond, msg) => { if (!cond) fail.push(msg) }
const nowIso = () => new Date().toISOString()

const SYNC_ORDER = ['profile', 'routines', 'routineDays', 'workouts', 'workoutSets']

const db = new Dexie('HooksTestDB')
db.version(1).stores({
  profile: 'id, dirty',
  routines: 'id, userId, dirty',
  routineDays: 'id, routineId, userId, dirty',
  workouts: 'id, userId, dirty',
  workoutSets: 'id, workoutId, userId, dirty',
})

// —— copia literal de src/db/syncHooks.ts ——
let activeUserId = null
const setSyncUser = (id) => { activeUserId = id }

for (const name of SYNC_ORDER) {
  const table = db.table(name)
  table.hook('creating', (_pk, obj) => {
    const row = obj
    if (row.dirty === 0) return
    row.updatedAt ??= nowIso()
    row.dirty = 1
    if (name !== 'profile' && !row.userId && activeUserId) row.userId = activeUserId
  })
  table.hook('updating', (mods) => {
    const patch = mods
    if ('dirty' in patch && patch.dirty === 0) return
    return { ...patch, updatedAt: nowIso(), dirty: 1 }
  })
}

await db.open()
setSyncUser(UID)

// ── 1. Un alta sin campos de sync queda sellada ────────────────────────────
await db.routines.add({ id: 'r1', name: 'PPL' })
let r = await db.routines.get('r1')
check(r.dirty === 1, 'alta: dirty debería ser 1')
check(typeof r.updatedAt === 'string', 'alta: updatedAt debería generarse')
check(r.userId === UID, `alta: userId debería completarse desde la sesión, fue ${r.userId}`)

// ── 2. Un update que NO menciona sync igual ensucia la fila ────────────────
//    (es el bug real de setActiveRoutine, que ponía updatedAt pero no synced)
await db.routines.update('r1', { dirty: 0 })   // simula "ya subida"
await db.routines.update('r1', { isActive: 1 })
r = await db.routines.get('r1')
check(r.dirty === 1, 'update: una edición debe volver a marcar dirty=1')
check(r.isActive === 1, 'update: se perdió el cambio')

// ── 3. EL ESCAPE: el pusher limpia el flag y NO se vuelve a ensuciar ───────
const before = await db.routines.get('r1')
await db.routines.update('r1', { dirty: 0 })
r = await db.routines.get('r1')
check(r.dirty === 0, 'ESCAPE ROTO: limpiar dirty lo volvió a poner en 1 → loop infinito de push')
check(r.updatedAt === before.updatedAt, 'limpiar dirty no debe tocar updatedAt (rompería el LWW)')

// ── 4. El escape también vale para .modify() en lote (así limpia el pusher) ─
await db.routines.add({ id: 'r2', name: 'Upper/Lower' })
await db.routines.where('id').anyOf(['r1', 'r2']).modify({ dirty: 0 })
const cleaned = await db.routines.where('dirty').equals(0).count()
check(cleaned === 2, `ESCAPE ROTO en modify(): quedaron ${cleaned}/2 filas limpias`)

// ── 5. El pull escribe filas limpias sin re-ensuciarlas ────────────────────
await db.workouts.put({
  id: 'w-remoto', userId: UID, name: 'Del servidor',
  startedAt: nowIso(), updatedAt: nowIso(), dirty: 0,
})
const remote = await db.workouts.get('w-remoto')
check(remote.dirty === 0, 'ESCAPE ROTO: una fila bajada del pull quedó marcada para re-subir')

// ── 6. Las hijas heredan el userId de la sesión ────────────────────────────
await db.workoutSets.add({ id: 's1', workoutId: 'w-remoto', reps: 10, weightKg: 60 })
const set = await db.workoutSets.get('s1')
check(set.userId === UID, `hija: userId no se completó, fue ${set.userId}`)

// ── 7. Sin sesión no se inventa un userId ──────────────────────────────────
setSyncUser(null)
await db.workoutSets.add({ id: 's2', workoutId: 'w-remoto', reps: 8, weightKg: 50 })
const orphan = await db.workoutSets.get('s2')
check(orphan.userId === undefined, 'sin sesión no debería asignarse userId')
check(orphan.dirty === 1, 'sin sesión igual debe marcarse dirty')

if (fail.length) {
  console.error('\n❌ FALLOS:')
  fail.forEach((f) => console.error('  - ' + f))
  process.exit(1)
}
console.log('✅ Hooks de sellado correctos, escape anti-loop funcionando.')
