import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Lock } from 'lucide-react'
import { personalRecordsFor, achievementsFor } from '@/db/scoped'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { ACHIEVEMENTS, syncAchievements } from '@/lib/achievements'
import { useTrainingStats } from '@/hooks/useTrainingStats'
import AchievementIcon from '@/components/gym/AchievementIcon'
import { SectionHeader } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

export default function AchievementsPanel() {
  const userId = useCurrentUserId()
  const stats = useTrainingStats()
  const prCount = useLiveQuery(
    () => (userId ? personalRecordsFor(userId).count() : 0),
    [userId]
  ) ?? 0
  const unlocked = useLiveQuery(
    () => (userId ? achievementsFor(userId).toArray() : []),
    [userId]
  ) ?? []
  const unlockedIds = new Set(unlocked.map((a) => a.id.slice((userId?.length ?? 0) + 1)))

  // Sincroniza en silencio: si hay datos que ya cumplen un logro, lo persiste
  // (la celebración con toast/confetti vive en el flujo de fin de entreno).
  useEffect(() => {
    if (userId && stats.totalWorkouts > 0) void syncAchievements(userId, { stats, prCount })
  }, [userId, stats, prCount])

  const count = unlockedIds.size
  const total = ACHIEVEMENTS.length

  return (
    <div className="animate-fade-up space-y-3">
      <SectionHeader
        title="Logros"
        action={
          <span className="font-mono text-sm text-accent">
            {count}/{total}
          </span>
        }
      />

      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full origin-left rounded-full bg-accent transition-transform duration-700"
          style={{ transform: `scaleX(${count / total})` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {ACHIEVEMENTS.map((a) => {
          const has = unlockedIds.has(a.id)
          return (
            <div
              key={a.id}
              className={cn(
                'flex items-center gap-3 rounded-xl border p-3 transition-colors',
                has ? 'border-accent/30 bg-accent/5' : 'border-line bg-surface opacity-60'
              )}
            >
              <span className={cn('shrink-0', has ? 'text-accent' : 'text-ink-3')}>
                {has ? <AchievementIcon name={a.icon} size={22} /> : <Lock size={20} />}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{a.name}</p>
                <p className="truncate text-[12px] text-ink-3">{a.description}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
