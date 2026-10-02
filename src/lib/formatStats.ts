/** Formato de las métricas de Progreso (puro, para probarlo en node). */

/** "septiembre de 2026" → "Septiembre de 2026". La clase CSS `capitalize` ponía
 * en mayúscula cada palabra y salía "Septiembre De 2026". */
export function capitalizeFirst(text: string): string {
  return text.charAt(0).toLocaleUpperCase('es-AR') + text.slice(1)
}

/** Duración total legible: "45 min", "1 h" o "1 h 18 min" (antes "1.3 h", con punto
 * decimal y sin minutos, que en es-AR se lee mal). */
export function formatTotalDuration(totalSec: number): string {
  const minutes = Math.max(0, Math.round(totalSec / 60))
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

/** Toneladas con coma decimal de es-AR: "12,5 t". */
export function formatTons(totalKg: number): string {
  const tons = Math.round((totalKg / 1000) * 10) / 10
  return `${tons.toLocaleString('es-AR', { maximumFractionDigits: 1 })} t`
}
