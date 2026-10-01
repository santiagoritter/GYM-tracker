/**
 * Sube un lote de filas y devuelve los índices de las que llegaron.
 *
 * Un `upsert` de PostgREST es todo o nada: si UNA fila viola una restricción
 * (not null, FK, check, RLS), se rechaza el lote entero. Antes, una sola fila
 * mala bloqueaba esa tabla en cada sync, para siempre: ninguna fila nueva
 * volvía a subir y el otro dispositivo "perdía" datos (bug real reportado por
 * testers). Ahora, si el lote falla con un error del servidor, se reintenta
 * fila por fila y suben todas las buenas; la mala queda marcada para el
 * próximo intento.
 *
 * Un error sin `code` es de red (offline, timeout): reintentar fila por fila
 * solo multiplicaría requests que van a fallar igual, así que no se hace.
 */
export interface UpsertError {
  code?: string
  message: string
}

export type Upsert = (rows: Record<string, unknown>[]) => Promise<{ error: UpsertError | null }>

export interface BatchResult {
  okIndexes: number[]
  failed: { index: number; error: UpsertError }[]
}

export async function upsertResilient(upsert: Upsert, rows: Record<string, unknown>[]): Promise<BatchResult> {
  const all = rows.map((_, i) => i)
  const { error } = await upsert(rows)
  if (!error) return { okIndexes: all, failed: [] }
  if (!error.code || rows.length === 1) {
    return { okIndexes: [], failed: all.map((index) => ({ index, error })) }
  }

  const okIndexes: number[] = []
  const failed: BatchResult['failed'] = []
  for (const index of all) {
    const res = await upsert([rows[index]!])
    if (res.error) failed.push({ index, error: res.error })
    else okIndexes.push(index)
  }
  return { okIndexes, failed }
}
