import { Dumbbell, Flame, Timer, TrendingUp, Trophy, Weight } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { personalRecordsFor } from '@/db/scoped'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { useTrainingStats } from '@/hooks/useTrainingStats'

export default function StatsOverview() {
  const userId = useCurrentUserId()
  const stats = useTrainingStats()
  const prCount = useLiveQuery(
    () => (userId ? personalRecordsFor(userId).count() : 0),
    [userId]
  ) ?? 0

  const hours = Math.round((stats.totalDurationSec / 3600) * 10) / 10
  const tons = Math.round((stats.totalVolumeKg / 1000) * 10) / 10
  const avgPerWeek = weeksSinceFirst(stats.dayKeys)

  const cards = [
    { icon: Dumbbell, label: 'Entrenos', value: String(stats.totalWorkouts), color: 'text-info' },
    { icon: Weight, label: 'Volumen', value: `${tons} t`, color: 'text-accent' },
    { icon: Timer, label: 'Tiempo', value: `${hours} h`, color: 'text-success' },
    { icon: Flame, label: 'Racha', value: `${stats.currentStreak}d`, color: 'text-warning' },
    { icon: Trophy, label: 'PRs', value: String(prCount), color: 'text-accent' },
    { icon: TrendingUp, label: 'Prom/sem', value: avgPerWeek, color: 'text-info' },
  ]

  return (
    <div className="grid grid-cols-3 gap-2">
      {cards.map(({ icon: Icon, label, value, color }) => (
        <div key={label} className="rounded-xl bg-surface p-3">
          <Icon size={16} className={color} />
          <p className="mt-2 font-mono text-lg font-bold leading-none">{value}</p>
          <p className="mt-1 text-xs text-ink-3">{label}</p>
        </div>
      ))}
    </div>
  )
}

/** Promedio de entrenos por semana desde el primer día registrado. */
function weeksSinceFirst(dayKeys: Set<string>): string {
  if (dayKeys.size === 0) return '0'
  const sorted = [...dayKeys].sort()
  const first = new Date(sorted[0]).getTime()
  const weeks = Math.max(1, (Date.now() - first) / (7 * 86_400_000))
  return (dayKeys.size / weeks).toFixed(1)
}
