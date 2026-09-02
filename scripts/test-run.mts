import {
  haversineM,
  cleanPoints,
  summarizeRun,
  currentPaceSecPerKm,
  estimateRunKcal,
  type RunPoint,
} from '@/lib/run'

/** Matemática de una salida a correr (B6): haversine, limpieza de puntos,
 * splits por km, ritmo, desnivel, calorías. Sin GPS real — puntos sintéticos
 * con geometría conocida. */

const fail: string[] = []
const check = (cond: boolean, msg: string) => {
  if (!cond) fail.push(msg)
}
const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol

// ── haversine: 1° de latitud ≈ 111.19 km ─────────────────────────────────
const d1deg = haversineM({ lat: 0, lng: 0, t: 0 }, { lat: 1, lng: 0, t: 0 })
check(near(d1deg, 111_195, 200), `haversine 1° lat: ${d1deg.toFixed(0)} m (esperado ~111195)`)

// Distancia corta este-oeste en el ecuador
const d100 = haversineM({ lat: 0, lng: 0, t: 0 }, { lat: 0, lng: 0.001, t: 0 })
check(near(d100, 111.32, 1), `haversine 0.001° lng: ${d100.toFixed(2)} m (esperado ~111.3)`)

// ── Recorrido sintético: línea recta hacia el norte, 5 km, 25 min ─────────
// 5 km ÷ 111195 m/° ≈ 0.044966° de latitud. 300 puntos (uno cada 5 s).
const START_LAT = -34.6
const TOTAL_M = 5000
const TOTAL_SEC = 25 * 60
const N = 300
const straight: RunPoint[] = Array.from({ length: N + 1 }, (_, i) => ({
  lat: START_LAT + (TOTAL_M / 111_195) * (i / N),
  lng: -58.4,
  t: i * (TOTAL_SEC / N) * 1000,
  acc: 5,
}))

const s = summarizeRun(straight, 70)
check(near(s.distanceM, TOTAL_M, 30), `distancia: ${s.distanceM.toFixed(0)} m (esperado ~5000)`)
check(near(s.durationSec, TOTAL_SEC, 2), `duración: ${s.durationSec.toFixed(0)} s (esperado 1500)`)
check(s.avgPaceSecPerKm !== null && near(s.avgPaceSecPerKm, 300, 3), `ritmo promedio: ${s.avgPaceSecPerKm?.toFixed(0)} s/km (esperado ~300)`)
check(s.splits.length === 5, `debería haber 5 splits, hubo ${s.splits.length}`)
check(s.splits.every((sp) => sp.distanceM === 1000), 'todos los splits completos deberían ser de 1000 m')
check(s.splits.every((sp) => near(sp.paceSecPerKm, 300, 8)), `cada split ~300 s/km: ${s.splits.map((x) => x.paceSecPerKm.toFixed(0))}`)
check(s.bestSplitSecPerKm !== null && near(s.bestSplitSecPerKm, 300, 8), `mejor split: ${s.bestSplitSecPerKm}`)
check(s.kcal === estimateRunKcal(s.distanceM, 70), 'kcal debería salir de estimateRunKcal')
check(s.kcal !== null && near(s.kcal, 315, 10), `kcal: ${s.kcal} (0.9 * 70 * 5 ≈ 315)`)

// ── Filtro de precisión ──────────────────────────────────────────────────
const noisy: RunPoint[] = [
  { lat: START_LAT, lng: -58.4, t: 0, acc: 5 },
  { lat: START_LAT + 0.05, lng: -58.4, t: 1000, acc: 80 }, // salto imposible + acc mala
  { lat: START_LAT + 0.001, lng: -58.4, t: 5000, acc: 5 },
]
const cleaned = cleanPoints(noisy)
check(cleaned.length === 2, `cleanPoints debería descartar el punto de acc 80: quedaron ${cleaned.length}`)

// ── Parado: sin distancia, sin ritmo ─────────────────────────────────────
const still: RunPoint[] = Array.from({ length: 20 }, (_, i) => ({
  lat: START_LAT + (Math.random() - 0.5) * 0.00001, // ~±0.5 m de jitter
  lng: -58.4,
  t: i * 1000,
  acc: 6,
}))
const stillSummary = summarizeRun(still)
check(stillSummary.distanceM < 5, `parado: distancia debería ser ~0, fue ${stillSummary.distanceM.toFixed(1)}`)
check(currentPaceSecPerKm(still) === null, 'ritmo instantáneo parado debería ser null')

// ── Parado con DRIFT REALISTA de GPS de navegador (el bug reportado) ──────
// 40 fixes en 200 s, saltando hasta ~12 m en cualquier dirección, con
// precisión reportada de 10-15 m. Sin el gate escalado por precisión, esto
// acumulaba cientos de metros ("me fui a caminar a la otra cuadra").
const M_PER_DEG = 111_195
const drift: RunPoint[] = Array.from({ length: 40 }, (_, i) => ({
  lat: START_LAT + ((i * 2654435761) % 1000 - 500) / 1000 * (12 / M_PER_DEG),
  lng: -58.4 + ((i * 40503) % 1000 - 500) / 1000 * (12 / M_PER_DEG),
  t: i * 5000,
  acc: 10 + (i % 6),
}))
const driftSummary = summarizeRun(drift)
check(
  driftSummary.distanceM < 25,
  `drift parado: la distancia debería quedar ~0, fue ${driftSummary.distanceM.toFixed(0)} m`
)
check(driftSummary.splits.length === 0, `drift parado: no debería haber splits, hubo ${driftSummary.splits.length}`)
check(currentPaceSecPerKm(drift) === null, 'drift parado: ritmo instantáneo debería ser null')

// ── Desnivel ─────────────────────────────────────────────────────────────
const hilly: RunPoint[] = [
  { lat: START_LAT, lng: -58.4, t: 0, alt: 10, acc: 5 },
  { lat: START_LAT + 0.005, lng: -58.4, t: 60_000, alt: 40, acc: 5 },
  { lat: START_LAT + 0.01, lng: -58.4, t: 120_000, alt: 20, acc: 5 },
]
const h = summarizeRun(hilly)
check(near(h.elevationGainM, 30, 1), `desnivel +: ${h.elevationGainM} (esperado 30)`)
check(near(h.elevationLossM, 20, 1), `desnivel −: ${h.elevationLossM} (esperado 20)`)

// ── Menos de 2 puntos ────────────────────────────────────────────────────
check(summarizeRun([]).distanceM === 0, 'summarizeRun([]) debería dar todo en cero')
check(summarizeRun([{ lat: 0, lng: 0, t: 0 }]).splits.length === 0, 'un solo punto: sin splits')

if (fail.length) {
  console.error('\n❌ FALLOS:')
  fail.forEach((f) => console.error('  - ' + f))
  process.exit(1)
}
console.log('✅ Run: haversine, distancia, splits por km, ritmo, filtro de precisión, desnivel y kcal correctos.')
