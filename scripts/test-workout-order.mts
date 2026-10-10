/**
 * Orden de los ejercicios en el entreno (reportado por testers: "salen
 * desordenados"). Reproduce el algoritmo VIEJO para probar que el escenario
 * rompe el orden, y comprueba el nuevo.
 */
import { nextExerciseOrder, orderExerciseGroups } from '@/lib/workoutUnits'
import { compareRoutineEntries, isKnownEntry, pickBestDay, visibleEntries } from '@/lib/routineEntries'
import type { WorkoutSet } from '@/types'

const fail: string[] = []
const check = (cond: boolean, msg: string) => {
  if (!cond) fail.push(msg)
}

let n = 0
const set = (id: string, exerciseId: string, setNumber: number, extra: Partial<WorkoutSet> = {}): WorkoutSet =>
  ({ id, workoutId: 'w', userId: 'u', exerciseId, setNumber, reps: 10, weightKg: 50, isWarmup: 0, completed: 0, dirty: 0,
     updatedAt: `2026-10-0${1 + (n++ % 9)}T00:00:00Z`, ...extra }) as WorkoutSet

// Rutina: A, B, C, D, E. UUID de las series 1 en ORDEN INVERSO al de la rutina
// (lo que hacía que el entreno saliera al revés, o al azar).
const routine = ['A', 'B', 'C', 'D', 'E']
const uuidFor: Record<string, string> = { A: 'ffff', B: 'dddd', C: 'bbbb', D: '3333', E: '1111' }
const sets: WorkoutSet[] = []
routine.forEach((ex, i) => {
  for (let k = 1; k <= 3; k++) sets.push(set(`${uuidFor[ex]}-${k}`, ex, k, { exerciseOrder: i + 1 }))
})
const dayEntries = routine.map((exerciseId, i) => ({ id: `re-${i}`, exerciseId, exerciseOrder: i + 1 }))

// ── El algoritmo viejo (Workout.tsx antes del arreglo) ───────────────────
function oldOrder(input: WorkoutSet[]): string[] {
  const dexieOrder = [...input].sort((a, b) => a.id.localeCompare(b.id)) // índice por workoutId, desempata por clave primaria
  const order: string[] = []
  const seen = new Set<string>()
  for (const s of dexieOrder.sort((a, b) => a.setNumber - b.setNumber)) {
    if (!seen.has(s.exerciseId)) {
      seen.add(s.exerciseId)
      order.push(s.exerciseId)
    }
  }
  return order
}
check(oldOrder(sets).join('') !== routine.join(''), 'el escenario no reproduce el bug viejo (el test no prueba nada)')

// ── Nuevo ─────────────────────────────────────────────────────────────────
const ids = (g: { exerciseId: string }[]) => g.map((x) => x.exerciseId).join('')
check(ids(orderExerciseGroups(sets, dayEntries)) === 'ABCDE', `con exerciseOrder: ${ids(orderExerciseGroups(sets, dayEntries))}`)

// Las series dentro de cada ejercicio, por setNumber.
check(orderExerciseGroups(sets).every((g) => g.sets.map((s) => s.setNumber).join() === '1,2,3'), 'series fuera de orden dentro del ejercicio')

// No muta el array de entrada (viene de useLiveQuery).
const frozen = Object.freeze([...sets]) as readonly WorkoutSet[]
let threw = false
try {
  orderExerciseGroups(frozen, dayEntries)
} catch {
  threw = true
}
check(!threw, 'ordenó el array de entrada in situ')

// Series anteriores a la columna: sin exerciseOrder, manda la posición en la rutina.
const legacy = sets.map(({ exerciseOrder: _drop, ...rest }) => rest as WorkoutSet)
check(ids(orderExerciseGroups(legacy, dayEntries)) === 'ABCDE', `sin exerciseOrder: ${ids(orderExerciseGroups(legacy, dayEntries))}`)

// Ejercicio agregado a mano: va al final, y varios agregados mantienen el orden en que se agregaron.
const withExtras = [
  ...sets,
  set('0000-1', 'X', 1, { exerciseOrder: nextExerciseOrder(sets) }),
  set('0001-1', 'Y', 1, { exerciseOrder: nextExerciseOrder([...sets, set('0000-1', 'X', 1, { exerciseOrder: 6 })]) }),
]
check(ids(orderExerciseGroups(withExtras, dayEntries)) === 'ABCDEXY', `agregados a mano: ${ids(orderExerciseGroups(withExtras, dayEntries))}`)
check(nextExerciseOrder(sets) === 6, `nextExerciseOrder: ${nextExerciseOrder(sets)}`)
check(nextExerciseOrder(legacy) === 6, 'nextExerciseOrder con series anteriores cuenta ejercicios')
check(nextExerciseOrder([]) === 1, 'nextExerciseOrder de un entreno vacío')

// Legado + agregado después de la actualización: el nuevo va después de los viejos.
const mixed = [...legacy, set('0000-1', 'X', 1, { exerciseOrder: nextExerciseOrder(legacy) })]
check(ids(orderExerciseGroups(mixed, dayEntries)) === 'ABCDEX', `legado + nuevo: ${ids(orderExerciseGroups(mixed, dayEntries))}`)

// Sin rutina y sin orden guardado (historial viejo): estable, no se pierde ningún ejercicio.
const bare = orderExerciseGroups(legacy)
check(bare.length === 5 && new Set(ids(bare)).size === 5, 'sin rutina: se perdió un ejercicio')
check(ids(bare) === ids(orderExerciseGroups(legacy)), 'sin rutina: no es estable')

// Superseries: los pares quedan adyacentes porque en la rutina son consecutivos.
const ss = sets.map((s) => (s.exerciseId === 'B' || s.exerciseId === 'C' ? { ...s, supersetGroup: 1 } : s))
const g = ids(orderExerciseGroups(ss, dayEntries))
check(g.indexOf('C') - g.indexOf('B') === 1, 'el par en superserie quedó separado')

// ── Entradas de rutina ────────────────────────────────────────────────────
const catalog = new Set(['A', 'B', 'C'])
const rows = [
  { id: 'z', exerciseId: 'B', exerciseOrder: 2 },
  { id: 'y', exerciseId: 'A', exerciseOrder: 2 }, // empate con z: desempata por id
  { id: 'x', exerciseId: '', exerciseOrder: 1 },
  { id: 'w', exerciseId: 'fantasma', exerciseOrder: 3 },
  { id: 'v', exerciseId: 'C', exerciseOrder: 4 },
]
check(visibleEntries(rows, catalog).map((r) => r.exerciseId).join('') === 'ABC', `visibles: ${visibleEntries(rows, catalog).map((r) => r.exerciseId).join('')}`)
check(!isKnownEntry({ exerciseId: '  ' }, catalog) && !isKnownEntry({ exerciseId: 'fantasma' }, catalog), 'vacío y desconocido no son válidos')
check(isKnownEntry({ exerciseId: 'cualquiera' }, new Set()), 'catálogo vacío: se acepta lo que tenga id')
check(compareRoutineEntries({ id: 'a', exerciseOrder: 1 }, { id: 'b', exerciseOrder: 1 }) < 0, 'empate: por id')

// ── Qué día originó el entreno ────────────────────────────────────────────
// Dos rutinas con un "Día 1": gana la que comparte más ejercicios, no la favorita.
const cand = [
  { dayId: 'activa', routineIsActive: true, exerciseIds: ['X', 'Y'] },
  { dayId: 'otra', routineIsActive: false, exerciseIds: ['A', 'B', 'C'] },
]
check(pickBestDay(cand, new Set(['A', 'B', 'C']))?.dayId === 'otra', 'pickBestDay: ganó la favorita aunque no comparte ejercicios')
check(pickBestDay(cand, new Set(['Z']))?.dayId === 'activa', 'pickBestDay: sin coincidencias debe preferir la favorita')
check(pickBestDay([], new Set(['A'])) === undefined, 'pickBestDay: sin candidatos')
check(
  pickBestDay([{ dayId: 'a', routineIsActive: false, exerciseIds: ['A'] }, { dayId: 'b', routineIsActive: true, exerciseIds: ['A'] }], new Set(['A']))?.dayId === 'b',
  'pickBestDay: empate de ejercicios → la favorita'
)

if (fail.length) {
  console.error('❌ Orden de ejercicios:\n  ' + fail.join('\n  '))
  process.exit(1)
}
console.log('✅ Orden: el entreno sigue la rutina (con y sin exerciseOrder guardado), los agregados van al final y los supersets quedan juntos.')
