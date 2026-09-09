import { registerPlugin } from '@capacitor/core'
import { platform } from '@/lib/native'

/**
 * Live Activities de iOS (pantalla de bloqueo + Dynamic Island).
 *
 * El puente nativo es un plugin propio, `LiveActivityPlugin.swift`, compilado
 * dentro del target `App`. El layout de la actividad vive en una Widget
 * Extension aparte (`ios/App/GymTrackerWidget/`) — ver `docs/16`.
 *
 * Todo acá degrada sin romper, mismo criterio que `native.ts`:
 *  - En web / Android: `platform !== 'ios'`, no hace nada.
 *  - En iOS sin la Widget Extension todavía agregada al proyecto, o con las
 *    Live Activities desactivadas por el usuario: el `try/catch` traga el
 *    "not implemented" / el throw de ActivityKit y sigue.
 */

interface LiveActivityPlugin {
  startRest(options: { endsAt: number; totalSeconds: number; exerciseName?: string }): Promise<void>
  endRest(): Promise<void>
  startWorkout(options: { name: string; startedAt: number }): Promise<void>
  updateWorkout(options: {
    exerciseName?: string
    setsDone: number
    setsTotal: number
  }): Promise<void>
  endWorkout(): Promise<void>
}

// El nombre tiene que coincidir EXACTO con el `@objc(...)` / `jsName` de
// `ios/App/App/LiveActivityPlugin.swift` — Capacitor 8 en iOS lo resuelve con
// `NSClassFromString(pluginId)`, no auto-descubre plugins embebidos.
const LiveActivity = registerPlugin<LiveActivityPlugin>('GymTrackerLiveActivity')

async function iosOnly(run: () => Promise<unknown>): Promise<void> {
  if (platform !== 'ios') return
  try {
    await run()
  } catch {
    // Plugin ausente (Widget Extension sin agregar), Live Activities
    // desactivadas, o iOS < 16.2: no es un error de la app.
  }
}

/** Arranca (o actualiza, si ya hay una) la Live Activity del descanso. iOS
 * dibuja la cuenta regresiva solo a partir de `endsAt` — no hay que
 * actualizar cada segundo. `exerciseName` se muestra en la vista expandida. */
export const startRestActivity = (
  endsAt: number,
  totalSeconds: number,
  exerciseName?: string
): Promise<void> => iosOnly(() => LiveActivity.startRest({ endsAt, totalSeconds, exerciseName }))

export const endRestActivity = (): Promise<void> => iosOnly(() => LiveActivity.endRest())

/** Live Activity del entreno en curso: tiempo transcurrido (lo cuenta iOS),
 * ejercicio actual y series hechas / totales. */
export const startWorkoutActivity = (name: string, startedAt: number): Promise<void> =>
  iosOnly(() => LiveActivity.startWorkout({ name, startedAt }))

export const updateWorkoutActivity = (state: {
  exerciseName?: string
  setsDone: number
  setsTotal: number
}): Promise<void> => iosOnly(() => LiveActivity.updateWorkout(state))

export const endWorkoutActivity = (): Promise<void> => iosOnly(() => LiveActivity.endWorkout())
