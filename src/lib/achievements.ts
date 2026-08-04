import { db } from '@/db/schema'
import { achievementsFor } from '@/db/scoped'
import { nowIso } from '@/lib/utils'
import type { TrainingStats } from '@/lib/stats'

export interface AchievementContext {
  stats: TrainingStats
  prCount: number
}

export interface AchievementDef {
  id: string
  name: string
  description: string
  emoji: string
  test: (ctx: AchievementContext) => boolean
}

/** Catálogo de logros. El orden define cómo se muestran en el panel. */
export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-workout', name: 'Primer paso', description: 'Completaste tu primer entreno', emoji: '🎯', test: (c) => c.stats.totalWorkouts >= 1 },
  { id: 'workouts-10', name: 'Constante', description: '10 entrenos completados', emoji: '🔟', test: (c) => c.stats.totalWorkouts >= 10 },
  { id: 'workouts-50', name: 'Veterano', description: '50 entrenos completados', emoji: '🏅', test: (c) => c.stats.totalWorkouts >= 50 },
  { id: 'workouts-100', name: 'Centurión', description: '100 entrenos completados', emoji: '💯', test: (c) => c.stats.totalWorkouts >= 100 },
  { id: 'streak-3', name: 'En marcha', description: 'Racha de 3 días seguidos', emoji: '🔥', test: (c) => c.stats.longestStreak >= 3 },
  { id: 'streak-7', name: 'Semana perfecta', description: 'Racha de 7 días seguidos', emoji: '⚡', test: (c) => c.stats.longestStreak >= 7 },
  { id: 'streak-30', name: 'Imparable', description: 'Racha de 30 días seguidos', emoji: '🚀', test: (c) => c.stats.longestStreak >= 30 },
  { id: 'first-pr', name: 'Récord roto', description: 'Lograste tu primer PR', emoji: '🏆', test: (c) => c.prCount >= 1 },
  { id: 'pr-10', name: 'Máquina de PRs', description: '10 récords personales', emoji: '📈', test: (c) => c.prCount >= 10 },
  { id: 'volume-10t', name: 'Tonelada', description: '10.000 kg de volumen acumulado', emoji: '🏋️', test: (c) => c.stats.totalVolumeKg >= 10_000 },
  { id: 'volume-100t', name: 'Cien toneladas', description: '100.000 kg de volumen acumulado', emoji: '🐘', test: (c) => c.stats.totalVolumeKg >= 100_000 },
]

export function getAchievement(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id)
}

/**
 * Compara el estado actual con los logros ya desbloqueados en la DB, persiste
 * los nuevos y los devuelve para poder celebrarlos con un toast/confetti.
 */
export async function syncAchievements(
  userId: string,
  ctx: AchievementContext
): Promise<AchievementDef[]> {
  const unlocked = await achievementsFor(userId).toArray()
  const unlockedDefIds = new Set(unlocked.map((a) => a.id.slice(userId.length + 1)))
  const newly: AchievementDef[] = []
  for (const def of ACHIEVEMENTS) {
    if (!unlockedDefIds.has(def.id) && def.test(ctx)) {
      await db.achievements.put({
        id: `${userId}_${def.id}`,
        userId,
        unlockedAt: nowIso(),
        dirty: 1,
        updatedAt: nowIso(),
      })
      newly.push(def)
    }
  }
  return newly
}
