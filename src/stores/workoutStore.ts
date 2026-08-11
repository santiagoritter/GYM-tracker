import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { db } from '@/db/schema'
import { softDelete, softDeleteMany } from '@/db/mutations'
import type { PersonalRecord, Workout, WorkoutSet } from '@/types'
import { nowIso, uid } from '@/lib/utils'
import { recommend } from '@/lib/recommendation'
import { cancelScheduledNotifications } from '@/lib/native'
import { computeVolumeKg, previewPRs } from '@/lib/workoutSummary'

interface RestTimerState {
  endsAt: number | null // epoch ms
  totalSeconds: number
}

interface WorkoutStore {
  restTimer: RestTimerState
  startRest: (seconds: number) => void
  extendRest: (seconds: number) => void
  skipRest: () => void

  startWorkout: (userId: string, name: string) => Promise<string>
  addExercise: (workoutId: string, exerciseId: string) => Promise<void>
  addSet: (workoutId: string, exerciseId: string, template?: Partial<WorkoutSet>) => Promise<void>
  updateSet: (setId: string, patch: Partial<WorkoutSet>) => Promise<void>
  removeSet: (setId: string) => Promise<void>
  finishWorkout: (userId: string, workoutId: string, notes?: string) => Promise<PersonalRecord[]>
  discardWorkout: (workoutId: string) => Promise<void>
}

/**
 * `restTimer` persiste en localStorage (mismo patrón que
 * `src/stores/themeStore.ts`) para sobrevivir a que el sistema mate la app
 * con un descanso corriendo — sin esto, al volver el estado visual
 * desaparecía aunque en nativo la notificación del SO ya estuviera
 * agendada y llegara igual (ver comentario en `RestTimer.tsx`).
 *
 * `partialize` deja afuera las acciones async: no tiene sentido
 * serializarlas y total no sobreviven a un reload de todos modos.
 */
export const useWorkoutStore = create<WorkoutStore>()(
  persist(
    (set, get) => ({
      restTimer: { endsAt: null, totalSeconds: 90 },

      startRest: (seconds) =>
        set({ restTimer: { endsAt: Date.now() + seconds * 1000, totalSeconds: seconds } }),

      extendRest: (seconds) => {
        const { restTimer } = get()
        if (restTimer.endsAt) {
          set({
            restTimer: {
              endsAt: restTimer.endsAt + seconds * 1000,
              totalSeconds: restTimer.totalSeconds + seconds,
            },
          })
        }
      },

      skipRest: () => set({ restTimer: { endsAt: null, totalSeconds: 90 } }),

      startWorkout: async (userId, name) => {
        const workout: Workout = {
          id: uid(),
          userId,
          name,
          startedAt: nowIso(),
          dirty: 1,
          updatedAt: nowIso(),
        }
        await db.workouts.add(workout)
        // restTimer es un store global, no atado a workoutId — si el
        // entreno anterior terminó con un descanso todavía corriendo (sin
        // llegar a 0 ni tocar "Saltar"), ese endsAt quedaba vivo y
        // aparecía como si ya hubiera un descanso activo en este entreno
        // recién arrancado, antes de completar ninguna serie.
        get().skipRest()
        return workout.id
      },

      addExercise: async (workoutId, exerciseId) => {
        // Agregar un ejercicio libremente arranca con las series que corresponden
        // al objetivo del usuario, ya precargadas con reps y peso sugeridos. Sin
        // esto el ejercicio aparecía con 0 kg y había que armarlo a mano.
        const workout = await db.workouts.get(workoutId)
        const exercise = await db.exercises.get(exerciseId)
        if (!workout || !exercise) return

        const [profile, history] = await Promise.all([
          db.profile.get(workout.userId),
          db.workoutSets
            .where('exerciseId')
            .equals(exerciseId)
            .filter((s) => s.userId === workout.userId && s.completed === 1 && s.isWarmup === 0)
            .toArray(),
        ])

        const rec = recommend(exercise, profile, history)
        for (let i = 0; i < rec.sets; i++) {
          await get().addSet(workoutId, exerciseId, {
            reps: rec.repsMin,
            weightKg: rec.weightKg,
          })
        }
      },

      addSet: async (workoutId, exerciseId, template) => {
        const [workout, existing] = await Promise.all([
          db.workouts.get(workoutId),
          db.workoutSets.where('[workoutId+exerciseId]').equals([workoutId, exerciseId]).toArray(),
        ])
        if (!workout) throw new Error('Entreno no encontrado')
        const last = existing.sort((a, b) => a.setNumber - b.setNumber).at(-1)
        const newSet: WorkoutSet = {
          id: uid(),
          workoutId,
          // Se toma del entreno padre, no de la sesión: así una serie nunca
          // queda huérfana de dueño aunque el store de auth todavía no cargó.
          userId: workout.userId,
          exerciseId,
          setNumber: (last?.setNumber ?? 0) + 1,
          reps: template?.reps ?? last?.reps ?? 10,
          weightKg: template?.weightKg ?? last?.weightKg ?? 0,
          isWarmup: template?.isWarmup ?? 0,
          completed: 0,
          dirty: 1,
          updatedAt: nowIso(),
        }
        await db.workoutSets.add(newSet)
      },

      updateSet: async (setId, patch) => {
        await db.workoutSets.update(setId, patch)
      },

      removeSet: async (setId) => {
        await softDelete('workoutSets', setId)
      },

      finishWorkout: async (userId, workoutId, notes) => {
        const sets = await db.workoutSets.where('workoutId').equals(workoutId).toArray()
        const totalVolumeKg = computeVolumeKg(sets)

        await db.workouts.update(workoutId, {
          finishedAt: nowIso(),
          notes,
          totalVolumeKg,
        })

        // Se recalcula acá (no se reusa lo ya mostrado en la vista previa):
        // prioriza corrección contra una preview que pudo quedar
        // desactualizada por una escritura concurrente, sobre nunca releer.
        const candidates = await previewPRs(userId, sets)
        const newPRs: PersonalRecord[] = []
        for (const c of candidates) {
          const pr: PersonalRecord = {
            id: `${userId}_${c.exerciseId}`,
            userId,
            exerciseId: c.exerciseId,
            weightKg: c.weightKg,
            reps: c.reps,
            oneRmKg: c.oneRmKg,
            achievedAt: nowIso(),
            workoutId,
            dirty: 1,
            updatedAt: nowIso(),
          }
          await db.personalRecords.put(pr)
          newPRs.push(pr)
        }

        get().skipRest()
        return newPRs
      },

      discardWorkout: async (workoutId) => {
        const sets = await db.workoutSets.where('workoutId').equals(workoutId).toArray()
        await softDeleteMany('workoutSets', sets.map((s) => s.id))
        await softDelete('workouts', workoutId)
        get().skipRest()
      },
    }),
    {
      name: 'gymtracker-resttimer',
      partialize: (state) => ({ restTimer: state.restTimer }),
      // Si la app murió de golpe con un descanso corriendo, esa sesión
      // nunca llegó a un unmount limpio: la notificación nativa que ya
      // había agendado sigue pendiente en el SO. Si acá reagendáramos otra
      // para el mismo horario (que es lo que haría el efecto de
      // RestTimer.tsx al montar con este endsAt restaurado) llegarían dos
      // avisos duplicados — se cancela la vieja antes de que eso pase.
      // Si el endsAt restaurado ya venció, se resetea silencioso: mismo
      // comportamiento de hoy, y si la notificación era nativa ya se
      // disparó a horario igual.
      onRehydrateStorage: () => (state) => {
        if (!state) return
        const { endsAt } = state.restTimer
        if (!endsAt) return
        if (endsAt > Date.now()) {
          cancelScheduledNotifications()
        } else {
          state.restTimer = { endsAt: null, totalSeconds: 90 }
        }
      },
    }
  )
)
