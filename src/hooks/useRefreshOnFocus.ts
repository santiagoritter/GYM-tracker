import { useEffect, useRef } from 'react'

/**
 * Vuelve a pedir datos cuando la app/pestaña vuelve a primer plano (y hay
 * conexión). El tablero del coach se cargaba una sola vez al montar: un coach
 * que dejaba la app abierta veía para siempre la foto vieja de sus alumnos.
 * `minGapMs` evita pedir de más si vuelve y se va varias veces seguidas.
 */
export function useRefreshOnFocus(refresh: () => void, minGapMs = 30_000): void {
  const latest = useRef(refresh)
  latest.current = refresh
  const lastRun = useRef(Date.now())

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || !navigator.onLine) return
      if (Date.now() - lastRun.current < minGapMs) return
      lastRun.current = Date.now()
      latest.current()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onVisible)
    }
  }, [minGapMs])
}
