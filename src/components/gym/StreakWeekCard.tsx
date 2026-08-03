import { useLiveQuery } from 'dexie-react-hooks'
import { Flame } from 'lucide-react'
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
  const metGoal = done >= goal

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Racha */}
      <div className="flex flex-col justify-between rounded-2xl bg-surface p-4">
        <div className="flex items-center gap-2">
          <Flame
            size={22}
            className={stats.currentStreak > 0 ? 'text-accent' : 'text-ink-3'}
            fill={stats.currentStreak > 0 ? 'currentColor' : 'none'}
          />
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-3">Racha</span>
        </div>
        <div>
          <p className="font-mono text-3xl font-bold leading-none">
            {stats.currentStreak}
            <span className="ml-1 text-sm font-medium text-ink-3">
              {stats.currentStreak === 1 ? 'día' : 'días'}
            </span>
          </p>
          <p className="mt-1 text-xs text-ink-3">
            {stats.currentStreak === 0
              ? '¡Entrená hoy para arrancar!'
              : `Mejor racha: ${stats.longestStreak} días`}
          </p>
        </div>
      </div>

      {/* Meta semanal */}
      <div className="flex items-center gap-3 rounded-2xl bg-surface p-4">
        <ProgressRing progress={goal > 0 ? done / goal : 0} size={64} stroke={6}>
          <span className="font-mono text-lg font-bold leading-none">{done}</span>
          <span className="text-[10px] text-ink-3">/{goal}</span>
        </ProgressRing>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">Esta semana</p>
          <p className="mt-1 text-sm font-medium leading-tight">
            {metGoal ? '¡Meta cumplida! 🎉' : `Faltan ${goal - done}`}
          </p>
        </div>
      </div>
    </div>
  )
}
