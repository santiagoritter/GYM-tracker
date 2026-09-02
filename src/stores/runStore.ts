import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { RunPoint } from '@/lib/run'
import { nowIso } from '@/lib/utils'

export type RunStatus = 'active' | 'paused'

export interface RunTarget {
  kind: 'distance' | 'time'
  value: number // metros o segundos
}

interface RunSession {
  workoutId: string
  startedAt: string
  status: RunStatus
  points: RunPoint[]
  /** ms acumulados en pausa (para descontar del tiempo total si hiciera falta). */
  pausedTotalMs: number
  /** epoch ms del inicio de la pausa en curso, si `status === 'paused'`. */
  pauseStartedAt: number | null
  target: RunTarget | null
}

interface RunStore {
  session: RunSession | null
  start: (workoutId: string, target: RunTarget | null) => void
  addPoint: (p: RunPoint) => void
  pause: () => void
  resume: () => void
  /** Termina y limpia. Devuelve los puntos crudos para resumir/guardar. */
  end: () => { points: RunPoint[] }
  discard: () => void
}

/**
 * Sesión de running en curso. A diferencia de `cardioStore`, SÍ se persiste
 * (localStorage vía zustand, como `restTimer`): una salida dura mucho y el
 * webview puede reciclarse en segundo plano — sin persistir se perdería el
 * recorrido acumulado. El plugin de background sigue registrando puntos a
 * nivel nativo aunque el JS muera; al volver, esta sesión sigue viva y se
 * le van agregando.
 */
export const useRunStore = create<RunStore>()(
  persist(
    (set, get) => ({
      session: null,

      start: (workoutId, target) =>
        set({
          session: {
            workoutId,
            startedAt: nowIso(),
            status: 'active',
            points: [],
            pausedTotalMs: 0,
            pauseStartedAt: null,
            target,
          },
        }),

      addPoint: (p) => {
        const { session } = get()
        if (!session || session.status !== 'active') return
        // Descarta duplicados exactos de timestamp (algunos backends repiten
        // el último fix al reanudar).
        const last = session.points[session.points.length - 1]
        if (last && last.t === p.t) return
        set({ session: { ...session, points: [...session.points, p] } })
      },

      pause: () => {
        const { session } = get()
        if (!session || session.status === 'paused') return
        set({ session: { ...session, status: 'paused', pauseStartedAt: Date.now() } })
      },

      resume: () => {
        const { session } = get()
        if (!session || session.status !== 'paused') return
        const extra = session.pauseStartedAt ? Date.now() - session.pauseStartedAt : 0
        set({
          session: {
            ...session,
            status: 'active',
            pauseStartedAt: null,
            pausedTotalMs: session.pausedTotalMs + extra,
          },
        })
      },

      end: () => {
        const points = get().session?.points ?? []
        set({ session: null })
        return { points }
      },

      discard: () => set({ session: null }),
    }),
    { name: 'gymtracker-run' }
  )
)
