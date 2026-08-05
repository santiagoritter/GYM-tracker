import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/schema'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { useTrainingStats } from '@/hooks/useTrainingStats'
import { localDayKey, startOfWeek } from '@/lib/stats'
import WeeklyActivityRings from '@/components/gym/WeeklyActivityRings'

const DAY_MS = 86_400_000

export default function StreakWeekCard() {
  const userId = useCurrentUserId()
  const stats = useTrainingStats()
  const profile = useLiveQuery(
    () => (userId ? db.profile.get(userId) : undefined),
    [userId]
  )
  const goal = profile?.weeklyGoal ?? 3
  const done = stats.thisWeekCount

  // Lunes a domingo de esta semana, cada uno true si hubo un entreno ese
  // día — se deriva de dayKeys (ya calculado por useTrainingStats, sin
  // query nueva).
  const trainedDays = useMemo(() => {
    const weekStart = startOfWeek()
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(weekStart.getTime() + i * DAY_MS)
      return stats.dayKeys.has(localDayKey(day))
    })
  }, [stats.dayKeys])

  return (
    <div className="flex items-center gap-4 rounded-2xl bg-surface p-4">
      <WeeklyActivityRings trainedDays={trainedDays}>
        <span className="font-mono text-2xl font-bold leading-none tabular-nums">{done}</span>
        <span className="text-[11px] text-ink-3">de {goal} días</span>
      </WeeklyActivityRings>
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
