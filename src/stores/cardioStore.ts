import { create } from 'zustand'
import type { CardioMachineId } from '@/lib/cardio'
import { currentDistanceKm } from '@/lib/cardio'
import { nowIso } from '@/lib/utils'

interface CardioSession {
  workoutId: string
  machineId: CardioMachineId
  startedAt: string
  speedKmh: number
  inclinePct: number
  /** Distancia acumulada hasta el último cambio de velocidad — junto con
   * `checkpointAt`, alcanza para derivar la distancia actual en cualquier
   * momento sin depender de que un timer haya tickeado exactamente cada
   * segundo (ver `currentDistanceKm` en lib/cardio.ts). */
  distanceAtCheckpointKm: number
  checkpointAt: number
}

interface CardioStore {
  session: CardioSession | null
  startSession: (workoutId: string, machineId: CardioMachineId, speedKmh: number, inclinePct: number) => void
  setSpeed: (kmh: number) => void
  setIncline: (pct: number) => void
  endSession: () => { distanceKm: number }
}

/** Sesión de cardio en curso — no persiste entre reinicios de la app (a
 * diferencia de `restTimer` en workoutStore): si el usuario mata la app a
 * mitad de una caminata, se pierde el progreso de esa sesión puntual, igual
 * que se perdería el de un cronómetro de mano. No hay `WorkoutSet`s
 * involucrados (cardio no tiene series), así que reusa `startWorkout`/
 * `finishWorkout` de workoutStore para la fila de `Workout` en sí. */
export const useCardioStore = create<CardioStore>()((set, get) => ({
  session: null,

  startSession: (workoutId, machineId, speedKmh, inclinePct) =>
    set({
      session: {
        workoutId,
        machineId,
        startedAt: nowIso(),
        speedKmh,
        inclinePct,
        distanceAtCheckpointKm: 0,
        checkpointAt: Date.now(),
      },
    }),

  setSpeed: (kmh) => {
    const { session } = get()
    if (!session) return
    set({
      session: {
        ...session,
        distanceAtCheckpointKm: currentDistanceKm(
          session.distanceAtCheckpointKm,
          session.speedKmh,
          session.checkpointAt
        ),
        checkpointAt: Date.now(),
        speedKmh: kmh,
      },
    })
  },

  setIncline: (pct) => {
    const { session } = get()
    if (!session) return
    set({ session: { ...session, inclinePct: pct } })
  },

  endSession: () => {
    const { session } = get()
    const distanceKm = session
      ? currentDistanceKm(session.distanceAtCheckpointKm, session.speedKmh, session.checkpointAt)
      : 0
    set({ session: null })
    return { distanceKm }
  },
}))
