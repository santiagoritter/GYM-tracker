import { create } from 'zustand'
import { db } from '@/db/schema'
import type { PersonalRecord, Workout, WorkoutSet } from '@/types'
import { calc1RM, nowIso, uid } from '@/lib/utils'

interface RestTimerState {
  endsAt: number | null // epoch ms
  totalSeconds: number
}

interface WorkoutStore {
  restTimer: RestTimerState
  startRest: (seconds: number) => void
  extendRest: (seconds: number) => void
  skipRest: () => void

  startWorkout: (name: string) => Promise<string>
  addExercise: (workoutId: string, exerciseId: string) => Promise<void>
  addSet: (workoutId: string, exerciseId: string, template?: Partial<WorkoutSet>) => Promise<void>
  updateSet: (setId: string, patch: Partial<WorkoutSet>) => Promise<void>
  removeSet: (setId: string) => Promise<void>
  finishWorkout: (workoutId: string, notes?: string) => Promise<PersonalRecord[]>
  discardWorkout: (workoutId: string) => Promise<void>
}

export const useWorkoutStore = create<WorkoutStore>((set, get) => ({
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

  startWorkout: async (name) => {
    const workout: Workout = {
      id: uid(),
      name,
      startedAt: nowIso(),
      synced: 0,
      updatedAt: nowIso(),
    }
    await db.workouts.add(workout)
    return workout.id
  },

  addExercise: async (workoutId, exerciseId) => {
    // Agregar un ejercicio = crear su primera serie vacía
    await get().addSet(workoutId, exerciseId)
  },

  addSet: async (workoutId, exerciseId, template) => {
    const existing = await db.workoutSets
      .where('[workoutId+exerciseId]')
      .equals([workoutId, exerciseId])
      .toArray()
    const last = existing.sort((a, b) => a.setNumber - b.setNumber).at(-1)
    const newSet: WorkoutSet = {
      id: uid(),
      workoutId,
      exerciseId,
      setNumber: (last?.setNumber ?? 0) + 1,
      reps: template?.reps ?? last?.reps ?? 10,
      weightKg: template?.weightKg ?? last?.weightKg ?? 0,
      isWarmup: template?.isWarmup ?? 0,
      completed: 0,
      synced: 0,
      updatedAt: nowIso(),
    }
    await db.workoutSets.add(newSet)
  },

  updateSet: async (setId, patch) => {
    await db.workoutSets.update(setId, { ...patch, updatedAt: nowIso(), synced: 0 })
  },

  removeSet: async (setId) => {
    await db.workoutSets.delete(setId)
  },

  finishWorkout: async (workoutId, notes) => {
    const sets = await db.workoutSets.where('workoutId').equals(workoutId).toArray()
    const workingSets = sets.filter((s) => s.completed === 1 && s.isWarmup === 0)
    const totalVolumeKg = workingSets.reduce((sum, s) => sum + s.weightKg * s.reps, 0)

    await db.workouts.update(workoutId, {
      finishedAt: nowIso(),
      notes,
      totalVolumeKg,
      updatedAt: nowIso(),
      synced: 0,
    })

    // Detección de PRs: mejor 1RM estimado por ejercicio
    const newPRs: PersonalRecord[] = []
    const byExercise = new Map<string, WorkoutSet[]>()
    for (const s of workingSets) {
      const list = byExercise.get(s.exerciseId) ?? []
      list.push(s)
      byExercise.set(s.exerciseId, list)
    }

    for (const [exerciseId, exSets] of byExercise) {
      const best = exSets.reduce((a, b) =>
        calc1RM(b.weightKg, b.reps) > calc1RM(a.weightKg, a.reps) ? b : a
      )
      const oneRm = calc1RM(best.weightKg, best.reps)
      if (oneRm <= 0) continue

      const current = await db.personalRecords.get(exerciseId)
      if (!current || oneRm > current.oneRmKg) {
        const pr: PersonalRecord = {
          id: exerciseId,
          exerciseId,
          weightKg: best.weightKg,
          reps: best.reps,
          oneRmKg: oneRm,
          achievedAt: nowIso(),
          workoutId,
        }
        await db.personalRecords.put(pr)
        newPRs.push(pr)
      }
    }

    return newPRs
  },

  discardWorkout: async (workoutId) => {
    await db.workoutSets.where('workoutId').equals(workoutId).delete()
    await db.workouts.delete(workoutId)
  },
}))
