import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CardioMachineId } from '@/lib/cardio'
import { currentDistanceKm } from '@/lib/cardio'
import { nowIso } from '@/lib/utils'

interface CardioSession {
  workoutId: string
  machineId: CardioMachineId
  startedAt: string
  /** Minutos que el usuario planea estar. Se usa para el anillo de progreso
   * y la proyección de distancia en la pantalla activa. Contar por encima
   * del objetivo no se corta: sigue en "overtime". */
  targetDurationMin: number
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
  startSession: (
    workoutId: string,
    machineId: CardioMachineId,
    speedKmh: number,
    inclinePct: number,
    targetDurationMin: number
  ) => void
  setSpeed: (kmh: number) => void
  setIncline: (pct: number) => void
  endSession: () => { distanceKm: number }
}

/** Sesión de cardio en curso. Se persiste (localStorage, como `runStore`): la
 * distancia se deriva de `checkpointAt`, no de timers, así que matar la app o
 * salir a otra pantalla no pierde velocidad, inclinación ni distancia
 * acumulada. No hay `WorkoutSet`s involucrados (cardio no tiene series), así
 * que reusa `startWorkout`/`finishWorkout` de workoutStore para la fila de
 * `Workout` en sí. */
export const useCardioStore = create<CardioStore>()(
  persist(
    (set, get) => ({
      session: null,

      startSession: (workoutId, machineId, speedKmh, inclinePct, targetDurationMin) =>
        set({
          session: {
            workoutId,
            machineId,
            startedAt: nowIso(),
            targetDurationMin,
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
    }),
    { name: 'gymtracker-cardio' }
  )
)
