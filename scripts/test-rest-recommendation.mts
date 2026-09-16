import { suggestRestSeconds } from '@/lib/restRecommendation'
import type { RestLog } from '@/types'

/** Sugerencia de nuevo tiempo de descanso (Bloque 6, TimeCounter): mediana
 * sobre outliers e items descartados, sin sugerir si la muestra es chica o
 * la diferencia es insignificante. */

const fail: string[] = []
const check = (cond: boolean, msg: string) => {
  if (!cond) fail.push(msg)
}

const NOW = Date.now()
const DAY_MS = 24 * 60 * 60 * 1000

function log(actualSeconds: number, opts: Partial<RestLog> = {}): RestLog {
  return {
    id: `log-${Math.random()}`,
    userId: 'u1',
    workoutId: 'w1',
    exerciseId: 'bench-press',
    plannedSeconds: 90,
    actualSeconds,
    discarded: 0,
    loggedAt: new Date(NOW - DAY_MS).toISOString(),
    dirty: 0,
    updatedAt: new Date(NOW).toISOString(),
    ...opts,
  }
}

// ── Muestra insuficiente: no sugiere nada ───────────────────────────────
check(
  suggestRestSeconds([log(150), log(150)], 90, NOW) === null,
  'con menos de 3 muestras no debería sugerir'
)

// ── Consistentemente más largo que lo planeado: sugiere subir ──────────
const longerLogs = [log(150), log(155), log(148), log(152), log(151)]
const suggestion = suggestRestSeconds(longerLogs, 90, NOW)
check(suggestion !== null, 'con descansos consistentemente más largos debería sugerir algo')
check(
  suggestion !== null && suggestion.medianSeconds >= 148 && suggestion.medianSeconds <= 155,
  `medianSeconds fuera de rango esperado: ${suggestion?.medianSeconds}`
)
check(
  suggestion !== null && suggestion.sampleSize === 5,
  `sampleSize esperado 5, dio ${suggestion?.sampleSize}`
)

// ── Diferencia insignificante: no sugiere ───────────────────────────────
const closeLogs = [log(92), log(88), log(91), log(93), log(89)]
check(
  suggestRestSeconds(closeLogs, 90, NOW) === null,
  'con descansos casi iguales a lo planeado no debería sugerir'
)

// ── Outlier aislado (contador dejado corriendo) no arrastra la mediana ──
const withOutlier = [log(95), log(92), log(94), log(93), log(96), log(1800)]
const outlierSuggestion = suggestRestSeconds(withOutlier, 60, NOW)
check(
  outlierSuggestion !== null && outlierSuggestion.medianSeconds < 200,
  `el outlier de 1800s no debería arrastrar la mediana: dio ${outlierSuggestion?.medianSeconds}`
)

// ── Descartados no cuentan para la muestra ──────────────────────────────
const withDiscarded = [
  log(150, { discarded: 1 }),
  log(155, { discarded: 1 }),
  log(148, { discarded: 1 }),
  log(90),
  log(91),
]
check(
  suggestRestSeconds(withDiscarded, 90, NOW) === null,
  'los descartados no deberían contar para alcanzar la muestra mínima'
)

// ── Fuera de la ventana de 60 días: no cuenta ───────────────────────────
const oldLogs = [
  log(150, { loggedAt: new Date(NOW - 90 * DAY_MS).toISOString() }),
  log(155, { loggedAt: new Date(NOW - 90 * DAY_MS).toISOString() }),
  log(148, { loggedAt: new Date(NOW - 90 * DAY_MS).toISOString() }),
]
check(
  suggestRestSeconds(oldLogs, 90, NOW) === null,
  'descansos de hace más de 60 días no deberían contar'
)

if (fail.length) {
  console.error('\n❌ FALLOS:')
  fail.forEach((f) => console.error('  - ' + f))
  process.exit(1)
}
console.log('✅ Recomendación de descanso: mediana, outliers, descartados y ventana correctos.')
