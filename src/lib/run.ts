/**
 * Matemática de una salida a correr, toda pura y testeable (ver
 * scripts/test-run.mts). Nada de acá toca el DOM, Dexie ni geolocalización:
 * recibe la lista de puntos GPS ya capturados y devuelve los números que
 * muestra la UI.
 *
 * Un `RunPoint` es lo mínimo que da la Geolocation API que sirve para esto:
 * lat/lng, timestamp (ms), y opcionalmente altitud y precisión horizontal
 * en metros (`acc`). Cadencia y pulso quedan fuera (no hay sensores BLE).
 */

export interface RunPoint {
  lat: number
  lng: number
  t: number // epoch ms
  alt?: number // metros
  acc?: number // precisión horizontal en metros
}

/** Puntos con precisión peor que esto se descartan de entrada. */
export const MAX_ACCURACY_M = 25
/** Precisión asumida cuando el fix no la reporta. */
const ACC_FALLBACK_M = 10
/** Piso de ruido: un tramo tiene que superar esto para contar como
 * movimiento real, aunque el GPS diga que te moviste. */
const MIN_STEP_M = 4
/** Tramo de cada split automático. */
export const SPLIT_DISTANCE_M = 1000
/** Corte de "en movimiento": velocidad instantánea por debajo cuenta como
 * pausa para el "tiempo en movimiento" y el ritmo promedio de movimiento. */
const MOVING_SPEED_MS = 0.6 // ~2.2 km/h
/** Velocidad máxima creíble para un humano corriendo (~43 km/h). Un salto
 * de GPS que la supere no infla `maxSpeed`. */
const MAX_HUMAN_SPEED_MS = 12

/**
 * Distancia mínima que hay que alejarse de un punto "confirmado" para que
 * el desplazamiento cuente. Escala con el error del GPS: si la precisión
 * es de 15 m, moverse 5 m es ruido; recién a >15 m se sabe que te moviste
 * de verdad. Esto es lo que evita que, parado, el drift dibuje una
 * caminata: los saltitos nunca llegan a superar el propio margen de error.
 */
function movementGateM(a: RunPoint, b: RunPoint): number {
  const acc = ((a.acc ?? ACC_FALLBACK_M) + (b.acc ?? ACC_FALLBACK_M)) / 2
  return Math.max(MIN_STEP_M, acc)
}

const R_EARTH_M = 6_371_000

/** Distancia sobre la esfera entre dos coordenadas, en metros (haversine). */
export function haversineM(a: RunPoint, b: RunPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R_EARTH_M * Math.asin(Math.sqrt(h))
}

/** Filtra los puntos usables: descarta los de precisión pobre y los saltos
 * imposibles (teletransportes por rebote de señal, > 40 m/s ≈ 144 km/h). */
export function cleanPoints(points: RunPoint[]): RunPoint[] {
  const out: RunPoint[] = []
  for (const p of points) {
    if (p.acc !== undefined && p.acc > MAX_ACCURACY_M) continue
    const prev = out[out.length - 1]
    if (prev) {
      const dt = (p.t - prev.t) / 1000
      if (dt <= 0) continue
      const speed = haversineM(prev, p) / dt
      if (speed > 40) continue
    }
    out.push(p)
  }
  return out
}

export interface Split {
  /** 1 = primer km. */
  index: number
  distanceM: number // normalmente 1000, el último puede ser menor
  durationSec: number
  /** Ritmo del tramo en segundos por km. */
  paceSecPerKm: number
}

export interface RunSummary {
  distanceM: number
  /** Tiempo total transcurrido (fin − inicio). */
  durationSec: number
  /** Tiempo con velocidad por encima del umbral de movimiento. */
  movingSec: number
  /** Ritmo promedio total, seg/km. `null` si no se recorrió nada. */
  avgPaceSecPerKm: number | null
  avgSpeedMs: number
  maxSpeedMs: number
  elevationGainM: number
  elevationLossM: number
  splits: Split[]
  /** Mejor split completo (1000 m), seg/km. `null` si no se completó ninguno. */
  bestSplitSecPerKm: number | null
  kcal: number | null
}

/** Ritmo (seg/km) → "m:ss". */
export function formatPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60)
  const s = Math.round(secPerKm % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function formatDistanceKm(distanceM: number): string {
  return (distanceM / 1000).toFixed(2)
}

function computeSplits(clean: RunPoint[]): Split[] {
  const splits: Split[] = []
  if (clean.length < 2) return splits

  let segStartT = clean[0].t
  let accInSeg = 0
  let idx = 1

  for (let i = 1; i < clean.length; i++) {
    const a = clean[i - 1]
    const b = clean[i]
    const stepM = haversineM(a, b)
    if (stepM < MIN_STEP_M) continue

    let remaining = stepM
    let stepStartT = a.t
    while (accInSeg + remaining >= SPLIT_DISTANCE_M) {
      const need = SPLIT_DISTANCE_M - accInSeg
      const frac = need / remaining
      const tAtBoundary = stepStartT + (b.t - stepStartT) * frac
      const durationSec = (tAtBoundary - segStartT) / 1000
      splits.push({
        index: idx++,
        distanceM: SPLIT_DISTANCE_M,
        durationSec,
        paceSecPerKm: durationSec, // 1000 m → seg/km = duración del tramo
      })
      // arrancar el próximo tramo desde el borde
      segStartT = tAtBoundary
      accInSeg = 0
      remaining -= need
      stepStartT = tAtBoundary
    }
    accInSeg += remaining
  }

  // Tramo final incompleto: solo si tiene entidad (≥ 50 m). Por debajo es
  // ruido acumulado y no vale mostrar un "parcial" con un ritmo absurdo.
  if (accInSeg >= 50) {
    const durationSec = (clean[clean.length - 1].t - segStartT) / 1000
    splits.push({
      index: idx,
      distanceM: Math.round(accInSeg),
      durationSec,
      paceSecPerKm: durationSec / (accInSeg / SPLIT_DISTANCE_M),
    })
  }
  return splits
}

/** Estimación cruda de calorías: correr consume ~0.9 kcal por kg y por km
 * (independiente bastante de la velocidad). Sin `bodyWeightKg` no se
 * calcula. */
export function estimateRunKcal(distanceM: number, bodyWeightKg?: number): number | null {
  if (!bodyWeightKg || bodyWeightKg <= 0) return null
  return Math.round(0.9 * bodyWeightKg * (distanceM / 1000))
}

export function summarizeRun(points: RunPoint[], bodyWeightKg?: number): RunSummary {
  const clean = cleanPoints(points)
  const empty: RunSummary = {
    distanceM: 0,
    durationSec: 0,
    movingSec: 0,
    avgPaceSecPerKm: null,
    avgSpeedMs: 0,
    maxSpeedMs: 0,
    elevationGainM: 0,
    elevationLossM: 0,
    splits: [],
    bestSplitSecPerKm: null,
    kcal: null,
  }
  if (clean.length < 2) return empty

  let distanceM = 0
  let movingSec = 0
  let maxSpeedMs = 0
  let gain = 0
  let loss = 0

  // Se avanza de punto "confirmado" en punto confirmado: un punto nuevo solo
  // confirma (y aporta su desplazamiento) cuando se alejó de `confirmed` más
  // que el margen de error del GPS (`movementGateM`). Parado, el drift nunca
  // supera ese margen y no acumula nada; en movimiento sostenido, aunque sea
  // lento, tarde o temprano te alejás lo suficiente y salta.
  const moved: RunPoint[] = [clean[0]]
  let confirmed = clean[0]

  for (let i = 1; i < clean.length; i++) {
    const p = clean[i]
    const d = haversineM(confirmed, p)
    if (d < movementGateM(confirmed, p)) continue

    const dt = (p.t - confirmed.t) / 1000
    if (dt <= 0) {
      confirmed = p
      continue
    }
    distanceM += d
    const speed = d / dt
    if (speed < MAX_HUMAN_SPEED_MS && speed > maxSpeedMs) maxSpeedMs = speed
    if (speed >= MOVING_SPEED_MS) movingSec += dt

    if (confirmed.alt !== undefined && p.alt !== undefined) {
      const dAlt = p.alt - confirmed.alt
      // umbral de 2 m: la altitud GPS es aún más ruidosa que la posición
      if (dAlt > 2) gain += dAlt
      else if (dAlt < -2) loss += -dAlt
    }

    confirmed = p
    moved.push(p)
  }

  const durationSec = (clean[clean.length - 1].t - clean[0].t) / 1000
  const avgPaceSecPerKm = distanceM > 0 ? (durationSec / distanceM) * 1000 : null
  const splits = computeSplits(moved)
  const fullSplits = splits.filter((s) => s.distanceM === SPLIT_DISTANCE_M)
  const bestSplitSecPerKm =
    fullSplits.length > 0 ? Math.min(...fullSplits.map((s) => s.paceSecPerKm)) : null

  return {
    distanceM,
    durationSec,
    movingSec,
    avgPaceSecPerKm,
    avgSpeedMs: durationSec > 0 ? distanceM / durationSec : 0,
    maxSpeedMs,
    elevationGainM: Math.round(gain),
    elevationLossM: Math.round(loss),
    splits,
    bestSplitSecPerKm,
    kcal: estimateRunKcal(distanceM, bodyWeightKg),
  }
}

/** Ritmo instantáneo suavizado sobre los últimos ~`windowSec` segundos —
 * lo que se muestra grande durante la corrida. `null` hasta tener señal
 * suficiente o si el corredor está parado. */
export function currentPaceSecPerKm(points: RunPoint[], windowSec = 30): number | null {
  if (points.length < 2) return null
  const now = points[points.length - 1].t
  const win = cleanPoints(points).filter((p) => now - p.t <= windowSec * 1000)
  if (win.length < 2) return null

  // Misma lógica de "punto confirmado" que summarizeRun: el drift parado no
  // debe generar un ritmo fantasma.
  let dist = 0
  let confirmed = win[0]
  for (let i = 1; i < win.length; i++) {
    const p = win[i]
    const d = haversineM(confirmed, p)
    if (d < movementGateM(confirmed, p)) continue
    dist += d
    confirmed = p
  }
  const dur = (win[win.length - 1].t - win[0].t) / 1000
  if (dist < MIN_STEP_M || dur <= 0) return null
  return (dur / dist) * 1000
}

/** Resumen para `Workout.notes` (mismo truco que cardio: no se agrega
 * columna, el historial ya muestra `notes`). */
export function formatRunNotes(s: RunSummary): string {
  const km = formatDistanceKm(s.distanceM)
  const dur = formatHms(s.durationSec)
  const pace = s.avgPaceSecPerKm ? ` (${formatPace(s.avgPaceSecPerKm)}/km)` : ''
  return `Salida a correr · ${km} km en ${dur}${pace}`
}

function formatHms(totalSec: number): string {
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = Math.floor(totalSec % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export { formatHms as formatRunHms }
