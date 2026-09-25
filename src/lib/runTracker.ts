import { create } from 'zustand'
import { startWatch, type GeoWatch } from '@/lib/geo'
import { useRunStore } from '@/stores/runStore'
import { summarizeRun } from '@/lib/run'
import { endRunActivity, startRunActivity, updateRunActivity } from '@/lib/liveActivity'
import { isNative } from '@/lib/native'

/**
 * Seguimiento de una salida a correr, DESACOPLADO de la pantalla.
 *
 * Antes el watcher de GPS y la Live Activity vivían en efectos de `Run.tsx`:
 * al navegar a otra pantalla (banner "Entreno en curso", Inicio, Ajustes…) el
 * cleanup los cortaba y la salida quedaba con un hueco en el recorrido. Acá el
 * ciclo de vida lo manejan `startTracking` / `stopTracking`, y `Run.tsx` es solo
 * vista. `ActiveSessionKeeper` lo reanuda al abrir la app si quedó una sesión
 * persistida.
 */

interface RunSignal {
  /** Llegó al menos un fix de GPS desde que arrancó el seguimiento. */
  hasFix: boolean
}

export const useRunSignal = create<RunSignal>()(() => ({ hasFix: false }))

let watch: GeoWatch | null = null
let unsubscribe: (() => void) | null = null
/** Se incrementa en cada start/stop: descarta el resultado de un `startWatch`
 * asíncrono que ya no corresponde (paró mientras arrancaba). */
let generation = 0
let running = false
let wakeLock: WakeLockSentinel | null = null

/**
 * Solo web: en nativo el seguimiento sigue igual con la pantalla apagada
 * (servicio en primer plano + permiso de ubicación en background); en un
 * navegador no hay nada parecido — si el usuario bloquea el teléfono, el
 * tab se suspende y el recorrido queda con huecos. `wakeLock` mantiene la
 * pantalla prendida mientras la pestaña esté visible (no evita que el
 * usuario decida bloquearla a mano, por eso el aviso en Run.tsx). El
 * propio SO puede soltarlo solo (cambiar de app, poca batería) — se
 * reintenta al volver a foreground.
 */
async function acquireWakeLock(): Promise<void> {
  if (isNative || !('wakeLock' in navigator)) return
  try {
    wakeLock = await navigator.wakeLock.request('screen')
    wakeLock.addEventListener('release', () => {
      wakeLock = null
    })
  } catch {
    // Denegado o no soportado en este momento (ej. tab no visible): no es
    // un error del usuario, no hay nada para reportar acá.
  }
}

function releaseWakeLock(): void {
  void wakeLock?.release().catch(() => undefined)
  wakeLock = null
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && running && !wakeLock) void acquireWakeLock()
  })
}

export function isTracking(): boolean {
  return running
}

export function startTracking(): void {
  if (running) return
  const session = useRunStore.getState().session
  if (!session) return

  running = true
  const mine = ++generation
  useRunSignal.setState({ hasFix: false })
  void acquireWakeLock()

  void startRunActivity('Corriendo', new Date(session.startedAt).getTime())

  // La Live Activity muestra distancia y ritmo: se actualiza cuando cambia la
  // cantidad de puntos (un fix cada 1-5 s), no en cada render de una pantalla.
  let lastCount = -1
  const pushActivity = () => {
    const s = useRunStore.getState().session
    if (!s || s.points.length === lastCount) return
    lastCount = s.points.length
    const summary = summarizeRun(s.points)
    void updateRunActivity({
      distanceM: summary.distanceM,
      avgPaceSecPerKm: summary.avgPaceSecPerKm ?? undefined,
    })
  }
  unsubscribe = useRunStore.subscribe(pushActivity)
  pushActivity()

  void startWatch((fix) => {
    useRunSignal.setState({ hasFix: true })
    if (useRunStore.getState().session?.status === 'active') {
      useRunStore.getState().addPoint(fix)
    }
  }).then((w) => {
    if (mine !== generation) w.clear()
    else watch = w
  })
}

export function stopTracking(): void {
  if (!running) return
  running = false
  generation++
  watch?.clear()
  watch = null
  unsubscribe?.()
  unsubscribe = null
  useRunSignal.setState({ hasFix: false })
  releaseWakeLock()
  void endRunActivity()
}
