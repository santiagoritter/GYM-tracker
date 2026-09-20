import { useCardioStore } from '@/stores/cardioStore'
import { cardioMachine, currentDistanceKm } from '@/lib/cardio'
import { endRunActivity, startRunActivity, updateRunActivity } from '@/lib/liveActivity'

/**
 * Live Activity de cardio, desacoplada de la pantalla (mismo motivo que
 * `runTracker.ts`): antes se cerraba al desmontar `Cardio.tsx`, o sea al salir
 * a otra pestaña, aunque la sesión siguiera corriendo. Distancia y ritmo
 * cambian de a poco (los aparatos sin velocidad ni los tienen), así que se
 * actualizan cada 10 s para no saturar el presupuesto de actualizaciones de
 * ActivityKit.
 */

const UPDATE_MS = 10_000

let timer: ReturnType<typeof setInterval> | null = null

function pushUpdate(): void {
  const s = useCardioStore.getState().session
  if (!s) return
  const machine = cardioMachine(s.machineId)
  void updateRunActivity({
    distanceM: machine.hasSpeed
      ? currentDistanceKm(s.distanceAtCheckpointKm, s.speedKmh, s.checkpointAt) * 1000
      : undefined,
    avgPaceSecPerKm: s.speedKmh > 0 ? 3600 / s.speedKmh : undefined,
  })
}

export function startCardioTracking(): void {
  if (timer) return
  const s = useCardioStore.getState().session
  if (!s) return
  void startRunActivity(cardioMachine(s.machineId).label, new Date(s.startedAt).getTime())
  pushUpdate()
  timer = setInterval(pushUpdate, UPDATE_MS)
}

export function stopCardioTracking(): void {
  if (!timer) return
  clearInterval(timer)
  timer = null
  void endRunActivity()
}
