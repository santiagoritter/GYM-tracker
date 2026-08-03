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

/** Métricas de entrenamiento reactivas (se recalculan al cambiar la DB). */
export function useTrainingStats(): TrainingStats {
  const userId = useCurrentUserId()
  const workouts = useLiveQuery(
    () => (userId ? workoutsFor(userId).toArray() : []),
    [userId]
  )
  if (!workouts) return EMPTY
  return computeStats(workouts)
}
