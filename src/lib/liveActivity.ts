import { registerPlugin } from '@capacitor/core'
import { platform } from '@/lib/native'

/**
 * Estado del descanso/entreno en curso fuera de la propia UI:
 *  - iOS: Live Activity (pantalla de bloqueo + Dynamic Island), plugin propio
 *    `LiveActivityPlugin.swift` + Widget Extension (`ios/App/GymTrackerWidget/`).
 *  - Android: notificación persistente con cronómetro nativo, plugin propio
 *    `WorkoutNotificationPlugin.java` (sin Widget Extension ni Dynamic
 *    Island — el equivalente ahí es la propia notificación, que Android sí
 *    deja actualizar con `setUsesChronometer`).
 *  - Web: no hace nada, no hay API equivalente.
 *
 * Ambos plugins nativos exponen la misma interfaz bajo el mismo nombre
 * (`GymTrackerLiveActivity`), así que el resto de la app llama a una sola
 * API sin `if (platform === ...)` en cada call site — ver docs/16.
 *
 * Todo acá degrada sin romper, mismo criterio que `native.ts`: el
 * `try/catch` traga el "not implemented" (Widget Extension sin agregar,
 * plugin Android ausente en una build vieja) o el throw de ActivityKit /
 * notificaciones desactivadas, y sigue.
 */

interface LiveActivityPlugin {
  startRest(options: { endsAt: number; totalSeconds: number; exerciseName?: string }): Promise<void>
  finishRest(options: { exerciseName?: string }): Promise<void>
  endRest(): Promise<void>
  startWorkout(options: { name: string; startedAt: number }): Promise<void>
  updateWorkout(options: {
    exerciseName?: string
    setsDone: number
    setsTotal: number
  }): Promise<void>
  endWorkout(): Promise<void>
  startRun(options: { label: string; startedAt: number }): Promise<void>
  updateRun(options: { distanceM?: number; avgPaceSecPerKm?: number }): Promise<void>
  endRun(): Promise<void>
}

// El nombre tiene que coincidir EXACTO con el `@objc(...)` / `jsName` de
// `LiveActivityPlugin.swift` y el `@CapacitorPlugin(name = ...)` de
// `WorkoutNotificationPlugin.java` — ninguna de las dos plataformas
// auto-descubre plugins embebidos, se resuelven por este nombre.
const LiveActivity = registerPlugin<LiveActivityPlugin>('GymTrackerLiveActivity')

async function nativeOnly(run: () => Promise<unknown>): Promise<void> {
  if (platform !== 'ios' && platform !== 'android') return
  try {
    await run()
  } catch {
    // Plugin ausente (Widget Extension sin agregar en iOS, build vieja sin
    // el plugin en Android), Live Activities/notificaciones desactivadas
    // por el usuario, o iOS < 16.2: no es un error de la app.
  }
}

/** Arranca (o actualiza, si ya hay una) la Live Activity/notificación del
 * descanso. El SO dibuja la cuenta regresiva solo a partir de `endsAt` — no
 * hay que actualizar cada segundo. `exerciseName` se muestra en la vista
 * expandida (iOS) o en el texto de la notificación (Android). */
export const startRestActivity = (
  endsAt: number,
  totalSeconds: number,
  exerciseName?: string
): Promise<void> => nativeOnly(() => LiveActivity.startRest({ endsAt, totalSeconds, exerciseName }))

/** El descanso llegó a 0: la Live Activity deja de mostrar el timer y muestra
 * solo el próximo ejercicio unos segundos antes de cerrarse sola. */
export const finishRestActivity = (exerciseName?: string): Promise<void> =>
  nativeOnly(() => LiveActivity.finishRest({ exerciseName }))

export const endRestActivity = (): Promise<void> => nativeOnly(() => LiveActivity.endRest())

/** Live Activity/notificación del entreno en curso: tiempo transcurrido (lo
 * cuenta el SO), ejercicio actual y series hechas / totales. */
export const startWorkoutActivity = (name: string, startedAt: number): Promise<void> =>
  nativeOnly(() => LiveActivity.startWorkout({ name, startedAt }))

export const updateWorkoutActivity = (state: {
  exerciseName?: string
  setsDone: number
  setsTotal: number
}): Promise<void> => nativeOnly(() => LiveActivity.updateWorkout(state))

export const endWorkoutActivity = (): Promise<void> => nativeOnly(() => LiveActivity.endWorkout())

/** Live Activity de running/cardio: tiempo transcurrido (lo cuenta iOS desde
 * `startedAt`), distancia y ritmo promedio — estos dos opcionales, porque
 * algunos aparatos de cardio no calculan distancia (sin velocidad). */
export const startRunActivity = (label: string, startedAt: number): Promise<void> =>
  nativeOnly(() => LiveActivity.startRun({ label, startedAt }))

export const updateRunActivity = (state: {
  distanceM?: number
  avgPaceSecPerKm?: number
}): Promise<void> => nativeOnly(() => LiveActivity.updateRun(state))

export const endRunActivity = (): Promise<void> => nativeOnly(() => LiveActivity.endRun())
