import { localDayKey } from '@/lib/stats'
import type { CalorieEntry, LocalProfile } from '@/types'

type CalorieGoalType = NonNullable<LocalProfile['calorieGoalType']>

export interface DailyCalorieSummary {
  totalKcal: number
  goalKcal: number
  remainingKcal: number
  /** 0..1+, sin capar en 1: por encima de 1 significa que se pasó la meta. */
  progress: number
}

/** Suma las entradas de un día contra la meta. Puro, sin Dexie ni React. */
export function summarizeDay(
  entries: CalorieEntry[],
  dateKey: string,
  goalKcal: number
): DailyCalorieSummary {
  const totalKcal = entries
    .filter((e) => localDayKey(e.loggedAt) === dateKey)
    .reduce((sum, e) => sum + e.kcal, 0)
  return {
    totalKcal,
    goalKcal,
    remainingKcal: Math.max(0, goalKcal - totalKcal),
    progress: goalKcal > 0 ? totalKcal / goalKcal : 0,
  }
}

export const GOAL_TYPE_LABELS: Record<CalorieGoalType, string> = {
  maintenance: 'Mantenimiento',
  deficit: 'Déficit',
  surplus: 'Superávit',
}
