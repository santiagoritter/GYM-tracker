import { supabase } from '@/lib/supabaseClient'
import type { PopularWeightRow } from '@/lib/news'

/**
 * Pesos más usados por la comunidad: RPC anónima `popular_exercise_weights()`
 * (migración 0026, k ≥ 5 usuarios). El último resultado queda en
 * localStorage para que la card de Noticias se vea igual sin señal; es un
 * agregado público, no hay nada personal que proteger en ese caché.
 */

const CACHE_KEY = 'repe-popular-weights'
/** No se vuelve a pedir antes de esto: el agregado cubre 30 días, cambia lento. */
export const REFRESH_AFTER_MS = 6 * 60 * 60 * 1000

export interface CachedPopularWeights {
  fetchedAt: string
  rows: PopularWeightRow[]
}

export function readCachedPopularWeights(): CachedPopularWeights | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedPopularWeights
    return Array.isArray(parsed.rows) && typeof parsed.fetchedAt === 'string' ? parsed : null
  } catch {
    return null
  }
}

export async function fetchPopularWeights(): Promise<CachedPopularWeights> {
  if (!supabase) throw new Error('Sin conexión con el servidor.')
  const { data, error } = await supabase.rpc('popular_exercise_weights')
  if (error) throw error
  const rows: PopularWeightRow[] = ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    exerciseId: String(r.exercise_id),
    users: Number(r.users),
    weightKg: Number(r.weight_kg),
  }))
  const out = { fetchedAt: new Date().toISOString(), rows }
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(out))
  } catch {
    // Sin storage (modo privado): se muestra igual, solo no queda cacheado.
  }
  return out
}
