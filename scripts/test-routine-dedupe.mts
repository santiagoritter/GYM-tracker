/**
 * Ejercicios duplicados en una rutina (reportado por un tester): doble toque
 * al agregar, o dos dispositivos que agregan lo mismo antes de sincronizar.
 */
import 'fake-indexeddb/auto'
import { db, seedIfEmpty } from '@/db/schema'
import { installSyncHooks, setSyncUser } from '@/db/syncHooks'
import { addExerciseToDay, repairRoutineExercises } from '@/db/routines'

const U = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'
const fail: string[] = []
const check = (cond: boolean, msg: string) => {
  if (!cond) fail.push(msg)
}

installSyncHooks(db)
setSyncUser(U)
await seedIfEmpty()

// Doble toque: dos llamadas en paralelo con el mismo ejercicio.
await db.routineDays.add({ id: 'd1', routineId: 'r1', userId: U, name: 'Push', dayOrder: 1, isRest: 0 } as never)
const [a, b] = await Promise.all([
  addExerciseToDay('d1', U, 'bench-press'),
  addExerciseToDay('d1', U, 'bench-press'),
])
const inDay = await db.routineExercises.where('dayId').equals('d1').toArray()
check(inDay.length === 1, `doble toque: quedaron ${inDay.length} filas en vez de 1`)
check(a === b, 'doble toque: las dos llamadas tienen que devolver la misma fila')
await addExerciseToDay('d1', U, 'squat')
const order = (await db.routineExercises.where('dayId').equals('d1').sortBy('exerciseOrder')).map((e) => e.exerciseId)
check(order.join() === 'bench-press,squat', 'el segundo ejercicio no quedó al final')

// Lo que ya quedó mal: duplicado de otro dispositivo + fila sin ejercicio válido.
const base = { userId: U, setsTarget: 3, repsMin: 8, repsMax: 12, restSeconds: 90 }
await db.routineExercises.bulkAdd([
  { id: 'dupA', dayId: 'd2', exerciseId: 'barbell-row', exerciseOrder: 1, ...base },
  { id: 'dupB', dayId: 'd2', exerciseId: 'barbell-row', exerciseOrder: 2, ...base },
  { id: 'keep', dayId: 'd2', exerciseId: 'squat', exerciseOrder: 3, ...base },
  { id: 'ghost', dayId: 'd2', exerciseId: 'no-existe', exerciseOrder: 4, ...base },
  { id: 'empty', dayId: 'd2', exerciseId: undefined, exerciseOrder: 5, ...base },
  // Otra cuenta en el mismo dispositivo: no se toca.
  { id: 'otherA', dayId: 'd9', exerciseId: 'barbell-row', exerciseOrder: 1, ...base, userId: OTHER },
  { id: 'otherB', dayId: 'd9', exerciseId: 'barbell-row', exerciseOrder: 2, ...base, userId: OTHER },
] as never)

const removed = await repairRoutineExercises(U)
const d2 = (await db.routineExercises.where('dayId').equals('d2').toArray()).map((e) => e.id).sort()
check(d2.join() === 'dupA,keep', `reparación: quedaron ${d2.join()}, se esperaba dupA,keep`)
check(removed === 3, `reparación: devolvió ${removed}, se esperaban 3 filas sacadas`)
const tombs = (await db.tombstones.where('userId').equals(U).toArray()).map((t) => t.id).sort()
check(['dupB', 'empty', 'ghost'].every((id) => tombs.includes(id)), 'reparación: los borrados no dejaron lápida (no llegarían a otros dispositivos)')
check((await db.routineExercises.where('dayId').equals('d9').count()) === 2, 'reparación: tocó datos de otra cuenta')
check((await repairRoutineExercises(U)) === 0, 'reparación: no es idempotente')

if (fail.length) {
  console.error('❌ Duplicados de rutina:\n - ' + fail.join('\n - '))
  process.exit(1)
}
console.log('✅ Rutinas: doble toque no duplica, la reparación deja un ejercicio por día y respeta otras cuentas.')
