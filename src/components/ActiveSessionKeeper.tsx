import { useEffect } from 'react'
import { useRunStore } from '@/stores/runStore'
import { useCardioStore } from '@/stores/cardioStore'
import { startTracking } from '@/lib/runTracker'
import { startCardioTracking } from '@/lib/cardioTracker'

/**
 * Reanuda, al abrir la app, el seguimiento de una salida a correr o de una
 * sesión de cardio que quedó persistida (el webview se reciclaba o el usuario
 * mató la app a mitad). No renderiza nada. Montado una sola vez, fuera de las
 * rutas — así navegar entre pantallas no toca el seguimiento.
 */
export default function ActiveSessionKeeper() {
  useEffect(() => {
    if (useRunStore.getState().session) startTracking()
    if (useCardioStore.getState().session) startCardioTracking()
  }, [])
  return null
}
