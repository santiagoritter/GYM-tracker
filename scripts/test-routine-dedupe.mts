/**
 * Ejercicios duplicados en una rutina (reportado por un tester): doble toque
 * al agregar, o dos dispositivos que agregan lo mismo antes de sincronizar.
 */
import 'fake-indexeddb/auto'
import { db, seedIfEmpty } from '@/db/schema'
import { installSyncHooks, setSyncUser } from '@/db/syncHooks'
import {
  addDay,
  addExerciseToDay,
  dayEntriesForWorkout,
  moveExercise,
  nextRoutineDay,
  repairRoutineExercises,
  routineDayEntries,
  startWorkoutFromDay,
} from '@/db/routines'

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
// `ghost` (un id que ESTE dispositivo no conoce) se OCULTA pero no se borra: una app
// desactualizada que lo borrara lo borraría para todos los dispositivos.
check(d2.join() === 'dupA,ghost,keep', `reparación: quedaron ${d2.join()}, se esperaba dupA,ghost,keep`)
check(removed === 2, `reparación: devolvió ${removed}, se esperaban 2 filas sacadas (duplicado y vacía)`)
const tombs = (await db.tombstones.where('userId').equals(U).toArray()).map((t) => t.id).sort()
check(['dupB', 'empty'].every((id) => tombs.includes(id)), 'reparación: los borrados no dejaron lápida (no llegarían a otros dispositivos)')
check(!tombs.includes('ghost'), 'reparación: borró con lápida un ejercicio que solo este dispositivo no conoce')
check((await db.routineExercises.where('dayId').equals('d9').count()) === 2, 'reparación: tocó datos de otra cuenta')
check((await repairRoutineExercises(U)) === 0, 'reparación: no es idempotente')
const orders = (await db.routineExercises.where('dayId').equals('d2').sortBy('exerciseOrder')).map((e) => `${e.id}:${e.exerciseOrder}`)
check(orders.join() === 'dupA:1,keep:2,ghost:3', `reparación: no renumeró 1..n (${orders.join()})`)
check((await routineDayEntries('d2')).map((e) => e.id).join() === 'dupA,keep', 'el fantasma se muestra en la rutina')

// ── Orden con empates: "mover" tiene que mover ────────────────────────────
await db.routineExercises.bulkAdd([
  { id: 'tieA', dayId: 'd3', exerciseId: 'bench-press', exerciseOrder: 1, ...base },
  { id: 'tieB', dayId: 'd3', exerciseId: 'squat', exerciseOrder: 1, ...base },
  { id: 'tieC', dayId: 'd3', exerciseId: 'deadlift', exerciseOrder: 1, ...base },
] as never)
await moveExercise('tieC', -1)
const afterMove = (await routineDayEntries('d3')).map((e) => e.id).join()
check(afterMove === 'tieA,tieC,tieB', `mover con empate: ${afterMove} (se esperaba tieA,tieC,tieB)`)

// ── Un día borrado del medio no repite el orden de otro ──────────────────
await db.routineDays.bulkAdd([
  { id: 'od1', routineId: 'r2', userId: U, name: 'A', dayOrder: 1, isRest: 0 },
  { id: 'od3', routineId: 'r2', userId: U, name: 'C', dayOrder: 3, isRest: 0 },
] as never)
const newDay = await addDay('r2', U, 'D')
check((await db.routineDays.get(newDay))!.dayOrder === 4, 'addDay repitió el orden de un día existente')

// ── Entrenar desde un día ─────────────────────────────────────────────────
await db.routineDays.bulkAdd([
  { id: 'dMix', routineId: 'r3', userId: U, name: 'Mixto', dayOrder: 2, isRest: 0 },
  { id: 'dEmpty', routineId: 'r3', userId: U, name: 'Vacío', dayOrder: 1, isRest: 0 },
] as never)
await db.routineExercises.bulkAdd([
  { id: 'mx1', dayId: 'dMix', exerciseId: 'squat', exerciseOrder: 2, ...base },
  { id: 'mx2', dayId: 'dMix', exerciseId: 'ejercicio-que-no-existe', exerciseOrder: 1, ...base },
  { id: 'mx3', dayId: 'dMix', exerciseId: 'bench-press', exerciseOrder: 3, ...base },
] as never)

const workoutsBefore = await db.workouts.count()
let emptyError = ''
try {
  await startWorkoutFromDay(U, 'dEmpty')
} catch (e) {
  emptyError = e instanceof Error ? e.message : String(e)
}
check(emptyError.includes('no tiene ejercicios'), `día vacío: tenía que avisar, dijo "${emptyError}"`)
check((await db.workouts.count()) === workoutsBefore, 'día vacío: creó un entreno vacío igual')

const wid = await startWorkoutFromDay(U, 'dMix')
const created = await db.workoutSets.where('workoutId').equals(wid).toArray()
check(!created.some((s) => s.exerciseId === 'ejercicio-que-no-existe'), 'entreno: creó series de un ejercicio fantasma')
const byOrder = [...new Map(created.map((s) => [s.exerciseId, s.exerciseOrder])).entries()].sort((a, b) => (a[1] ?? 0) - (b[1] ?? 0))
check(byOrder.map(([id]) => id).join() === 'squat,bench-press', `entreno: orden ${byOrder.map(([id]) => id).join()} (la rutina es squat, bench-press)`)
check(byOrder.map(([, o]) => o).join() === '1,2', `entreno: exerciseOrder ${byOrder.map(([, o]) => o).join()} (se esperaba 1,2)`)

// "Qué día toca": nunca un día vacío.
const next = await nextRoutineDay(U, 'r3')
check(next?.id === 'dMix', `nextRoutineDay propuso ${next?.id}, se esperaba dMix (dEmpty no tiene ejercicios)`)
await db.routineDays.add({ id: 'dOnlyEmpty', routineId: 'r4', userId: U, name: 'Solo vacío', dayOrder: 1, isRest: 0 } as never)
check((await nextRoutineDay(U, 'r4')) === undefined, 'nextRoutineDay propuso un día vacío cuando es el único')

// ── Entreno de una rutina que NO es la favorita (reportado: seguía desordenado) ──
await db.routines.bulkAdd([
  { id: 'rFav', userId: U, name: 'Favorita', color: '#E8FF47', isActive: 1, isArchived: 0 },
  { id: 'rOtra', userId: U, name: 'Otra', color: '#60A5FA', isActive: 0, isArchived: 0 },
] as never)
await db.routineDays.bulkAdd([
  { id: 'dFav', routineId: 'rFav', userId: U, name: 'Día 1', dayOrder: 1, isRest: 0 },
  { id: 'dOtra', routineId: 'rOtra', userId: U, name: 'Día 1', dayOrder: 1, isRest: 0 },
] as never)
await db.routineExercises.bulkAdd([
  { id: 'f1', dayId: 'dFav', exerciseId: 'bench-press', exerciseOrder: 1, ...base },
  { id: 'o1', dayId: 'dOtra', exerciseId: 'deadlift', exerciseOrder: 1, ...base },
  { id: 'o2', dayId: 'dOtra', exerciseId: 'squat', exerciseOrder: 2, ...base },
] as never)
const found = await dayEntriesForWorkout(U, 'Día 1', new Set(['deadlift', 'squat']))
check(found.map((e) => e.id).join() === 'o1,o2', `entreno de otra rutina: encontró ${found.map((e) => e.id).join()}, se esperaba o1,o2`)
check((await dayEntriesForWorkout(U, 'Entreno libre', new Set(['squat']))).length === 0, 'entreno libre: no debería matchear ningún día')
check((await dayEntriesForWorkout(OTHER, 'Día 1', new Set(['squat']))).length === 0, 'tocó rutinas de otra cuenta')

if (fail.length) {
  console.error('❌ Duplicados de rutina:\n - ' + fail.join('\n - '))
  process.exit(1)
}
console.log('✅ Rutinas: sin duplicados ni fantasmas, orden estable, el entreno no se crea vacío y nunca se propone un día sin ejercicios.')
