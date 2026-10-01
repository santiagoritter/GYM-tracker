/** Card Noticias: ranking de pesos de la comunidad y PRs que más subieron. */
import { rankPopularWeights, topPrImprovements } from '@/lib/news'
import type { WorkoutSet } from '@/types'

const fail: string[] = []
const check = (cond: boolean, msg: string) => {
  if (!cond) fail.push(msg)
}

const names = new Map([
  ['bench-press', { name: 'Press banca' }],
  ['squat', { name: 'Sentadilla' }],
  ['deadlift', { name: 'Peso muerto' }],
  ['curl', { name: 'Curl' }],
])

// ── Comunidad ────────────────────────────────────────────────────────────
const ranked = rankPopularWeights(
  [
    { exerciseId: 'bench-press', users: 40, weightKg: 60 },
    { exerciseId: 'custom-xyz', users: 9, weightKg: 300 },
    { exerciseId: 'deadlift', users: 12, weightKg: 100 },
    { exerciseId: 'squat', users: 30, weightKg: 80 },
    { exerciseId: 'curl', users: 8, weightKg: 0 },
  ],
  names
)
check(ranked.map((r) => r.exerciseId).join() === 'deadlift,squat,bench-press', `orden por peso: ${ranked.map((r) => r.exerciseId).join()}`)
check(!ranked.some((r) => r.exerciseId === 'custom-xyz'), 'un ejercicio fuera del catálogo no puede aparecer')
check(ranked[0]?.name === 'Peso muerto', 'lleva el nombre del catálogo')

// ── PRs ──────────────────────────────────────────────────────────────────
const now = Date.parse('2026-10-01T12:00:00Z')
const old = '2026-08-01T10:00:00Z' // > 30 días
const recent = '2026-09-25T10:00:00Z'
const started = new Map([['w-old', old], ['w-new', recent]])
let n = 0
const set = (exerciseId: string, workoutId: string, weightKg: number, reps: number, extra: Partial<WorkoutSet> = {}): WorkoutSet =>
  ({ id: `s${n++}`, workoutId, userId: 'u', exerciseId, setNumber: 1, reps, weightKg, isWarmup: 0, completed: 1,
     // updatedAt reciente a propósito: la fecha que cuenta es la del entreno.
     updatedAt: '2026-09-30T00:00:00Z', dirty: 0, ...extra }) as WorkoutSet

const sets = [
  set('bench-press', 'w-old', 60, 5), set('bench-press', 'w-new', 70, 5), // +16,7 %
  set('squat', 'w-old', 100, 5), set('squat', 'w-new', 105, 5), //          +5 %
  set('deadlift', 'w-new', 140, 5), //                                       sin marca previa
  set('curl', 'w-old', 20, 8), set('curl', 'w-new', 18, 8), //              bajó
  set('squat', 'w-new', 200, 5, { isWarmup: 1 }), //                         calentamiento, no cuenta
  set('bench-press', 'w-new', 150, 5, { completed: 0 }), //                  sin completar, no cuenta
]
const prs = topPrImprovements(sets, started, names, now)
check(prs.map((p) => p.exerciseId).join() === 'bench-press,squat', `PRs: ${prs.map((p) => p.exerciseId).join()}`)
// Epley con mismas reps: el % del 1RM es el % del peso (calc1RM redondea).
check(Math.abs((prs[0]?.pct ?? 0) - 10 / 60) < 0.005, `pct banca ${prs[0]?.pct}`)
check(prs[0]!.nowKg > prs[0]!.beforeKg, 'now > before')
check(topPrImprovements(sets, started, names, now, 1).length === 1, 'respeta el límite')
check(topPrImprovements([], started, names, now).length === 0, 'sin series, sin PRs')

if (fail.length) {
  console.error('❌ Noticias:\n  ' + fail.join('\n  '))
  process.exit(1)
}
console.log('✅ Noticias: comunidad ordenada por peso y solo del catálogo; PRs contra hace 30 días.')
