/**
 * `logPastWorkout` (Fase 3) es la única función que crea un `Workout` con
 * timestamps elegidos por el usuario en vez de `nowIso()` — el riesgo real
 * es que `finishedAt` quede sin setear (lo que la app entera trata como
 * "entreno en curso") o que un PR backdateado termine con `achievedAt` de
 * hoy en vez de la fecha elegida.
 */
import 'fake-indexeddb/auto'
import { db } from '@/db/schema'
import { installSyncHooks, setSyncUser } from '@/db/syncHooks'
import { logPastWorkout } from '@/db/pastWorkouts'
import { computeStats, localDayKey } from '@/lib/stats'
import { dateInputToIso } from '@/lib/utils'

const UID = '11111111-1111-4111-8111-111111111111'
const fail: string[] = []
const check = (cond: boolean, msg: string) => { if (!cond) fail.push(msg) }

installSyncHooks(db)
setSyncUser(UID)

// ── 0. dateInputToIso: el día vuelve a leerse igual, sea cual sea el huso
//    horario donde corra este proceso — el bug clásico es Date('2026-01-05')
//    interpretado como medianoche UTC, que en UTC-3 cae en el 4 de enero.
check(
  localDayKey(dateInputToIso('2026-01-05')) === '2026-01-05',
  `dateInputToIso corrió el día: localDayKey dio ${localDayKey(dateInputToIso('2026-01-05'))}`
)
check(
  localDayKey(dateInputToIso('2026-12-31')) === '2026-12-31',
  'dateInputToIso: fin de año también debería sobrevivir el redondeo'
)

const PAST_DATE = dateInputToIso('2026-01-05')

// ── 1. finishedAt siempre queda seteado, nunca "entreno en curso" ─────────
const { workoutId, newPRs } = await logPastWorkout(UID, 'Entreno de prueba', PAST_DATE, [
  { exerciseId: 'bench-press', sets: [{ reps: 10, weightKg: 60 }, { reps: 8, weightKg: 65 }] },
  { exerciseId: 'squat', sets: [{ reps: 5, weightKg: 100 }] },
])

const workout = await db.workouts.get(workoutId)
check(Boolean(workout), 'logPastWorkout: no se guardó el workout')
check(workout?.finishedAt === PAST_DATE, `finishedAt debería ser la fecha elegida, es ${workout?.finishedAt}`)
check(workout?.startedAt === PAST_DATE, `startedAt debería ser la fecha elegida, es ${workout?.startedAt}`)

// No debe aparecer como "entreno en curso" en ningún filtro que use ese
// criterio (workoutsFor(...).filter(w => !w.finishedAt), Layout.tsx).
const asInProgress = (await db.workouts.toArray()).filter((w) => !w.finishedAt)
check(asInProgress.length === 0, `no debería haber entrenos "en curso" tras cargar uno pasado, hay ${asInProgress.length}`)

// ── 2. totalVolumeKg calculado en la creación ──────────────────────────────
const expectedVolume = 60 * 10 + 65 * 8 + 100 * 5
check(
  workout?.totalVolumeKg === expectedVolume,
  `totalVolumeKg esperado ${expectedVolume}, es ${workout?.totalVolumeKg}`
)

// ── 3. Todas las series quedan completed:1, isWarmup:0 ─────────────────────
const sets = await db.workoutSets.where('workoutId').equals(workoutId).toArray()
check(sets.length === 3, `esperaba 3 series, hay ${sets.length}`)
check(sets.every((s) => s.completed === 1 && s.isWarmup === 0), 'todas las series deberían quedar completadas, sin calentamiento')

// ── 4. Primer PR: achievedAt es la fecha elegida, no "ahora" ───────────────
check(newPRs.length === 2, `esperaba 2 PRs nuevos (primeros de cada ejercicio), hay ${newPRs.length}`)
const benchPR = await db.personalRecords.get(`${UID}_bench-press`)
check(benchPR?.achievedAt === PAST_DATE, `achievedAt debería ser la fecha elegida, es ${benchPR?.achievedAt}`)
check(benchPR?.workoutId === workoutId, 'el PR debería apuntar al workout recién creado')

// ── 5. Un segundo entreno pasado, más flojo, no pisa el PR ya guardado ────
const { newPRs: secondPRs } = await logPastWorkout(UID, 'Otro entreno', '2026-01-10T12:00:00.000Z', [
  { exerciseId: 'bench-press', sets: [{ reps: 5, weightKg: 40 }] },
])
check(secondPRs.length === 0, `un set más flojo no debería generar PR, generó ${secondPRs.length}`)
const benchPRAfter = await db.personalRecords.get(`${UID}_bench-press`)
check(benchPRAfter?.achievedAt === PAST_DATE, 'el PR original no debería haberse pisado')

// ── 6. computeStats ve el entreno cargado (día local correcto) ─────────────
const allWorkouts = await db.workouts.toArray()
const stats = computeStats(allWorkouts)
check(stats.totalWorkouts === 2, `computeStats debería contar los 2 entrenos cargados, contó ${stats.totalWorkouts}`)
check(
  Math.round(stats.totalVolumeKg) === expectedVolume + 40 * 5,
  `volumen total esperado ${expectedVolume + 40 * 5}, computeStats dio ${stats.totalVolumeKg}`
)
// Día local: 2026-01-05T12:00:00Z en cualquier huso de -12 a +14 sigue
// siendo el 5 de enero — confirma que dateInputToIso (mediodía local) no
// corre el día al guardar/leer.
check(stats.dayKeys.has('2026-01-05'), `dayKeys debería incluir el 5 de enero, tiene: ${[...stats.dayKeys].join(', ')}`)

if (fail.length) {
  console.error(`\n❌ ${fail.length} FALLOS:`)
  fail.forEach((f) => console.error('  - ' + f))
  process.exit(1)
}
console.log('✅ logPastWorkout: finishedAt, volumen, PRs backdateados y streak correctos.')
