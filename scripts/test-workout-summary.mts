/**
 * `workoutSummary.ts` es la única fuente de verdad de volumen/PRs que
 * comparten la vista previa de "Finalizar entreno" (Workout.tsx) y el
 * guardado real (`finishWorkout`) — si esto se rompe, preview y guardado
 * pueden divergir sin que se note visualmente.
 */
import 'fake-indexeddb/auto'
import { db } from '@/db/schema'
import { installSyncHooks, setSyncUser } from '@/db/syncHooks'
import {
  workingSetsOf,
  computeVolumeKg,
  computeDurationSec,
  bestSetPerExercise,
  previewPRs,
} from '@/lib/workoutSummary'
import type { WorkoutSet } from '@/types'

const UID = '11111111-1111-4111-8111-111111111111'
const fail: string[] = []
const check = (cond: boolean, msg: string) => { if (!cond) fail.push(msg) }

installSyncHooks(db)
setSyncUser(UID)

const set = (over: Partial<WorkoutSet>): WorkoutSet => ({
  id: 'x', workoutId: 'w1', userId: UID, exerciseId: 'bench-press',
  setNumber: 1, reps: 10, weightKg: 60, isWarmup: 0, completed: 1,
  dirty: 1, updatedAt: '',
  ...over,
})

// ── 1. workingSetsOf: solo completadas y sin calentamiento ─────────────────
const sets = [
  set({ id: 's1', completed: 1, isWarmup: 0 }),
  set({ id: 's2', completed: 0, isWarmup: 0 }), // sin completar: afuera
  set({ id: 's3', completed: 1, isWarmup: 1 }), // calentamiento: afuera
  set({ id: 's4', completed: 1, isWarmup: 0, exerciseId: 'squat', weightKg: 100, reps: 5 }),
]
const working = workingSetsOf(sets)
check(working.length === 2, `workingSetsOf: esperaba 2, dio ${working.length}`)
check(working.every((s) => s.id === 's1' || s.id === 's4'), 'workingSetsOf: filtró mal')

// ── 2. computeVolumeKg: suma peso*reps solo de las que cuentan ─────────────
const vol = computeVolumeKg(sets)
check(vol === 60 * 10 + 100 * 5, `computeVolumeKg: esperaba ${60 * 10 + 100 * 5}, dio ${vol}`)
check(computeVolumeKg([]) === 0, 'computeVolumeKg: vacío debería dar 0')

// ── 3. computeDurationSec ──────────────────────────────────────────────────
const started = '2026-01-01T00:00:00.000Z'
const nowMs = new Date('2026-01-01T00:05:30.000Z').getTime()
check(
  computeDurationSec(started, nowMs) === 330,
  `computeDurationSec: esperaba 330, dio ${computeDurationSec(started, nowMs)}`
)
check(computeDurationSec(started, new Date(started).getTime() - 1000) === 0, 'computeDurationSec: no debería dar negativo')

// ── 4. bestSetPerExercise: mejor 1RM estimado por ejercicio ────────────────
const rival = [
  set({ id: 'a1', exerciseId: 'bench-press', weightKg: 60, reps: 10 }), // 1RM ~80
  set({ id: 'a2', exerciseId: 'bench-press', weightKg: 80, reps: 3 }),  // 1RM ~88, gana
  set({ id: 'a3', exerciseId: 'squat', weightKg: 100, reps: 5 }),
]
const best = bestSetPerExercise(rival)
check(best.get('bench-press')?.id === 'a2', 'bestSetPerExercise: no eligió el de mayor 1RM')
check(best.get('squat')?.id === 'a3', 'bestSetPerExercise: perdió el único set de squat')

// ── 5. previewPRs: compara contra lo ya guardado, sin escribir nada ────────
await db.personalRecords.add({
  id: `${UID}_bench-press`, userId: UID, exerciseId: 'bench-press',
  weightKg: 60, reps: 10, oneRmKg: 80, achievedAt: '2026-01-01T00:00:00Z', workoutId: 'w0',
} as never)

const beats = await previewPRs(UID, [
  set({ id: 'b1', exerciseId: 'bench-press', weightKg: 90, reps: 3 }), // 1RM ~99, mejora
])
check(beats.length === 1, `previewPRs: esperaba 1 mejora, dio ${beats.length}`)
check(beats[0]?.previousOneRmKg === 80, 'previewPRs: no trajo el 1RM anterior')

const noBeats = await previewPRs(UID, [
  set({ id: 'b2', exerciseId: 'bench-press', weightKg: 40, reps: 5 }), // 1RM bajo, no mejora
])
check(noBeats.length === 0, `previewPRs: no debería haber mejora, dio ${noBeats.length}`)

const firstPr = await previewPRs(UID, [
  set({ id: 'b3', exerciseId: 'squat', weightKg: 100, reps: 5 }), // sin PR previo
])
check(firstPr.length === 1, `previewPRs: primer PR de squat, dio ${firstPr.length}`)
check(firstPr[0]?.previousOneRmKg === undefined, 'previewPRs: no debería tener anterior en el primer PR')

// previewPRs no debe haber escrito nada — sigue habiendo un solo PR guardado
const stored = await db.personalRecords.toArray()
check(stored.length === 1, `previewPRs no debería persistir: hay ${stored.length} PRs guardados`)

if (fail.length) {
  console.error(`\n❌ ${fail.length} FALLOS:`)
  fail.forEach((f) => console.error('  - ' + f))
  process.exit(1)
}
console.log('✅ workoutSummary: volumen, duración y preview de PRs correctos.')
