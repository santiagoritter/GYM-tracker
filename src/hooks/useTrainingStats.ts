import { useLiveQuery } from 'dexie-react-hooks'
import { workoutsFor } from '@/db/scoped'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { computeStats, type TrainingStats } from '@/lib/stats'

const EMPTY: TrainingStats = {
  totalWorkouts: 0,
  totalVolumeKg: 0,
  totalDurationSec: 0,
  currentStreak: 0,
  longestStreak: 0,
  thisWeekCount: 0,
  dayKeys: new Set(),
}

/** `ready` es false mientras la DB todavía no respondió: mostrar "0 días de racha"
 * en ese instante contradecía lo que aparecía un segundo después en Progreso. */
export type LiveTrainingStats = TrainingStats & { ready: boolean }

const LOADING: LiveTrainingStats = { ...EMPTY, ready: false }

/** Métricas de entrenamiento reactivas (se recalculan al cambiar la DB). */
export function useTrainingStats(): LiveTrainingStats {
  const userId = useCurrentUserId()
  const workouts = useLiveQuery(
    () => (userId ? workoutsFor(userId).toArray() : []),
    [userId]
  )
  if (!workouts) return LOADING
  return { ...computeStats(workouts), ready: true }
}
