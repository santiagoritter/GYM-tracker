import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/schema'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { useTrainingStats } from '@/hooks/useTrainingStats'
import ProgressRing from '@/components/ui/ProgressRing'

export default function StreakWeekCard() {
  const userId = useCurrentUserId()
  const stats = useTrainingStats()
  const profile = useLiveQuery(
    () => (userId ? db.profile.get(userId) : undefined),
    [userId]
  )
  const goal = profile?.weeklyGoal ?? 3
  const done = stats.thisWeekCount

  return (
    <div className="flex items-center gap-4 rounded-2xl bg-surface p-4">
      <ProgressRing progress={goal > 0 ? done / goal : 0} size={72} stroke={7}>
        <span className="font-mono text-2xl font-bold leading-none tabular-nums">{done}</span>
        <span className="text-[11px] text-ink-3">de {goal} días</span>
      </ProgressRing>
      <div className="min-w-0">
        <p className="text-[15px] font-semibold">
          {done >= goal ? 'Meta semanal cumplida' : `Faltan ${goal - done} para la meta`}
        </p>
        <p className="mt-1 text-[13px] text-ink-3">
          {stats.currentStreak === 0
            ? 'Entrená hoy para arrancar una racha'
            : `Racha actual: ${stats.currentStreak} ${stats.currentStreak === 1 ? 'día' : 'días'} · mejor: ${stats.longestStreak}`}
        </p>
      </div>
    </div>
  )
}
