import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Lock } from 'lucide-react'
import { db } from '@/db/schema'
import { ACHIEVEMENTS, syncAchievements } from '@/lib/achievements'
import { useTrainingStats } from '@/hooks/useTrainingStats'
import { cn } from '@/lib/utils'

export default function AchievementsPanel() {
  const stats = useTrainingStats()
  const prCount = useLiveQuery(() => db.personalRecords.count(), []) ?? 0
  const unlocked = useLiveQuery(() => db.achievements.toArray(), []) ?? []
  const unlockedIds = new Set(unlocked.map((a) => a.id))

  // Sincroniza en silencio: si hay datos que ya cumplen un logro, lo persiste
  // (la celebración con toast/confetti vive en el flujo de fin de entreno).
  useEffect(() => {
    if (stats.totalWorkouts > 0) void syncAchievements({ stats, prCount })
  }, [stats, prCount])

  const count = unlockedIds.size
  const total = ACHIEVEMENTS.length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">Logros</h2>
        <span className="font-mono text-sm text-accent">
          {count}/{total}
        </span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-accent transition-all duration-700"
          style={{ width: `${(count / total) * 100}%` }}
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
              <span className={cn('text-2xl', !has && 'grayscale')}>
                {has ? a.emoji : <Lock size={20} className="text-ink-3" />}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{a.name}</p>
                <p className="truncate text-[11px] text-ink-3">{a.description}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
