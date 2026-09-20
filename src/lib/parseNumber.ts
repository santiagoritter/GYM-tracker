/** Entero opcional de un input de texto: vacío o inválido → `null` (nunca NaN). */
export function parseOptionalInt(raw: string, { min = 0, max = 80 } = {}): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  if (!Number.isFinite(n)) return null
  return Math.min(max, Math.max(min, Math.round(n)))
}
