import type { RestLog } from '@/types'

/** Misma ventana que usa `recommendation.ts` para el 1RM reciente — el
 * criterio de "qué es reciente" es el mismo en todo el recomendador. */
const RECENT_WINDOW_DAYS = 60
/** Con menos muestras que esto, la mediana es ruido — no se sugiere nada. */
const MIN_SAMPLE_SIZE = 3
/** Si la sugerencia no difiere del valor actual al menos este %, no vale la
 * pena mostrarla — cambiar 90s por 92s no le aporta nada al usuario. */
const MIN_DIFFERENCE_RATIO = 0.15

export interface RestSuggestion {
  exerciseId: string
  /** Mediana de `actualSeconds`, redondeada, tras sacar outliers. */
  medianSeconds: number
  currentSeconds: number
  /** Cuántas muestras entraron en la mediana (después de sacar outliers). */
  sampleSize: number
}

function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2
}

/**
 * Saca outliers por rango intercuartílico (IQR) antes de la mediana — el
 * caso concreto que hay que filtrar es "se dejó el contador corriendo sin
 * querer" (un `actualSeconds` gigante y aislado) o una sesión rarísima,
 * ninguno de los dos representativo de cómo descansa la persona en
 * general. Con pocas muestras (<4) el IQR no tiene suficiente resolución
 * para distinguir outlier de dato real, así que no se filtra nada.
 */
function excludeOutliers(values: number[]): number[] {
  if (values.length < 4) return values
  const sorted = [...values].sort((a, b) => a - b)
  const q1 = sorted[Math.floor(sorted.length * 0.25)]!
  const q3 = sorted[Math.floor(sorted.length * 0.75)]!
  const iqr = q3 - q1
  if (iqr === 0) return sorted
  const lower = q1 - 1.5 * iqr
  const upper = q3 + 1.5 * iqr
  return sorted.filter((v) => v >= lower && v <= upper)
}

/**
 * Sugiere un nuevo tiempo de descanso para un ejercicio a partir de su
 * historial de `RestLog` — mediana (no media: unas pocas sesiones raras no
 * deben mover el número tanto como un promedio dejaría), excluyendo
 * descansos descartados (`discarded: 1`, el usuario marcó que ese dato no
 * cuenta) y outliers estadísticos. `null` si no hay muestra suficiente o si
 * la sugerencia no difiere lo bastante del valor actual como para valer la
 * pena mostrarla — nunca cambia nada solo, es una sugerencia que el
 * usuario confirma (mismo criterio que la sugerencia de nivel en Ajustes).
 */
export function suggestRestSeconds(
  logs: readonly RestLog[],
  currentSeconds: number,
  now: number = Date.now()
): RestSuggestion | null {
  if (currentSeconds <= 0) return null
  const cutoff = now - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000
  const relevant = logs.filter(
    (l) => l.discarded === 0 && new Date(l.loggedAt).getTime() >= cutoff
  )
  if (relevant.length < MIN_SAMPLE_SIZE) return null

  const cleaned = excludeOutliers(relevant.map((l) => l.actualSeconds))
  if (cleaned.length < MIN_SAMPLE_SIZE) return null

  const medianSeconds = Math.round(median([...cleaned].sort((a, b) => a - b)))
  const differenceRatio = Math.abs(medianSeconds - currentSeconds) / currentSeconds
  if (differenceRatio < MIN_DIFFERENCE_RATIO) return null

  return {
    exerciseId: relevant[0]!.exerciseId,
    medianSeconds,
    currentSeconds,
    sampleSize: cleaned.length,
  }
}
