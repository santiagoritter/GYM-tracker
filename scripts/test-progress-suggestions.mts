/** Sugerencias de peso y descanso en Progreso: misma regla que las notificaciones. */
import { EXERCISES_SEED } from '@/data/exercises'
import { restSuggestions, suggestionFor, weightSuggestions } from '@/lib/progressSuggestions'
import type { RestLog, WorkoutSet } from '@/types'

const fail: string[] = []
const check = (cond: boolean, msg: string) => {
  if (!cond) fail.push(msg)
}

const bench = EXERCISES_SEED.find((e) => e.id === 'bench-press')!
const squat = EXERCISES_SEED.find((e) => e.id === 'squat')!
const set = (exerciseId: string, weightKg: number, reps: number, extra: Partial<WorkoutSet> = {}): WorkoutSet =>
  ({ id: Math.random().toString(36), workoutId: 'w', userId: 'u', exerciseId, setNumber: 1, reps, weightKg,
     isWarmup: 0, completed: 1, updatedAt: '2026-09-01T00:00:00Z', dirty: 0, ...extra }) as WorkoutSet

// Sin historial propio no hay "aumento" que sugerir.
check(suggestionFor(squat, undefined, [set('bench-press', 60, 10)]) === null, 'sin historial del ejercicio no debería sugerir')

// Con un historial sólido (topó el rango de reps), el recomendador sube.
const sets = [set('bench-press', 60, 12), set('bench-press', 60, 12), set('bench-press', 60, 12)]
const one = suggestionFor(bench, undefined, sets)
check(one !== null && one.prevBestKg === 60, 'la mejor marca tiene que ser 60')
const list = weightSuggestions(EXERCISES_SEED, undefined, sets)
check(list.length === 1 && list[0]!.exerciseId === 'bench-press', 'solo ejercicios entrenados, aunque no suban')
check(list[0]?.isIncrease === (list[0]!.weightKg > 60), 'isIncrease = misma condición que la notificación')
// Objetivo fuerza (85 % del 1RM): con 60 × 12 el recomendador sí sube.
const strong = weightSuggestions(EXERCISES_SEED, { goal: 'strength' } as never, [
  ...sets,
  set('squat', 100, 5, { updatedAt: '2026-09-20T00:00:00Z' }),
])
check(strong.some((s) => s.exerciseId === 'bench-press' && s.isIncrease), 'con objetivo fuerza debería marcar la banca como aumento')
check(strong[0]?.isIncrease === true, 'los aumentos van primero')

// Calentamientos y series no completadas no cuentan como marca.
const withWarmup = [...sets, set('bench-press', 100, 1, { isWarmup: 1 }), set('bench-press', 120, 1, { completed: 0 })]
check(suggestionFor(bench, undefined, withWarmup)?.prevBestKg === 60, 'calentamiento o serie sin completar inflaron la mejor marca')

// Descansos: 3+ muestras recientes que se alejan de lo fijado.
const now = new Date('2026-09-30T12:00:00Z').getTime()
const log = (exerciseId: string, actual: number, daysAgo: number): RestLog =>
  ({ id: Math.random().toString(36), userId: 'u', workoutId: 'w', exerciseId, plannedSeconds: 90, actualSeconds: actual,
     discarded: 0, loggedAt: new Date(now - daysAgo * 86400_000).toISOString(), updatedAt: '', dirty: 0 }) as RestLog
const logs = [log('squat', 180, 1), log('squat', 175, 2), log('squat', 185, 3), log('bench-press', 92, 1)]
const rows = restSuggestions(logs, [{ id: 're1', exerciseId: 'squat', restSeconds: 90 }], 90, now)
check(rows.length === 1 && rows[0]!.exerciseId === 'squat', 'solo squat tiene muestra suficiente')
check(rows[0]?.routineEntryIds.join() === 're1', 'la sugerencia tiene que apuntar a su fila de rutina')
check((rows[0]?.suggestion.medianSeconds ?? 0) >= 175, 'la mediana tiene que reflejar lo que descansa')

if (fail.length) {
  console.error('❌ Sugerencias de Progreso:\n - ' + fail.join('\n - '))
  process.exit(1)
}
console.log('✅ Sugerencias de Progreso: peso solo cuando supera tu marca, descansos con muestra suficiente.')
