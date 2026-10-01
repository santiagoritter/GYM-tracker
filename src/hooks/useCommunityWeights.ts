import { useEffect, useState } from 'react'
import {
  fetchPopularWeights,
  readCachedPopularWeights,
  REFRESH_AFTER_MS,
  type CachedPopularWeights,
} from '@/lib/communityWeights'

export type CommunityState =
  | { status: 'loading' }
  | { status: 'ready'; data: CachedPopularWeights }
  | { status: 'error' }

/**
 * Pesos de la comunidad con caché: arranca con lo último guardado (funciona
 * sin señal) y refresca en segundo plano si pasaron más de 6 h. Un error de
 * red con caché no se muestra como error: se sigue viendo lo guardado.
 * `enabled = false` para invitados: la RPC exige sesión.
 */
export function useCommunityWeights(enabled: boolean): {
  state: CommunityState
  retry: () => void
} {
  const [state, setState] = useState<CommunityState>(() => {
    const cached = readCachedPopularWeights()
    return cached ? { status: 'ready', data: cached } : { status: 'loading' }
  })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!enabled) return
    const cached = readCachedPopularWeights()
    const fresh = cached && Date.now() - Date.parse(cached.fetchedAt) < REFRESH_AFTER_MS
    if (fresh && attempt === 0) return
    if (!navigator.onLine) {
      if (!cached) setState({ status: 'error' })
      return
    }
    let cancelled = false
    fetchPopularWeights()
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data })
      })
      .catch(() => {
        if (!cancelled && !cached) setState({ status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [enabled, attempt])

  return {
    state,
    retry: () => {
      setState((s) => (s.status === 'error' ? { status: 'loading' } : s))
      setAttempt((n) => n + 1)
    },
  }
}
