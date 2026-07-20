import type { Workout } from '@/types'

/** Clave de día local YYYY-MM-DD (no UTC: la racha se mide en días locales). */
export function localDayKey(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

function dayKeyToDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const DAY_MS = 86_400_000

/** Racha actual y más larga de días consecutivos con al menos un entreno. */
export function computeStreak(dayKeys: Set<string>): {
  current: number
  longest: number
} {
  if (dayKeys.size === 0) return { current: 0, longest: 0 }

  const sorted = [...dayKeys].sort()
  const dates = sorted.map(dayKeyToDate)

  // Racha más larga histórica
  let longest = 1
  let run = 1
  for (let i = 1; i < dates.length; i++) {
    const diff = Math.round((dates[i].getTime() - dates[i - 1].getTime()) / DAY_MS)
    run = diff === 1 ? run + 1 : 1
    if (run > longest) longest = run
  }

  // Racha actual: se cuenta hacia atrás desde hoy (o ayer si hoy no se entrenó,
  // así una racha viva no se rompe hasta perder un día completo).
  const today = dayKeyToDate(localDayKey(new Date()))
  let cursor = today
  if (!dayKeys.has(localDayKey(cursor))) {
    cursor = new Date(cursor.getTime() - DAY_MS)
    if (!dayKeys.has(localDayKey(cursor))) return { current: 0, longest }
  }
  let current = 0
  while (dayKeys.has(localDayKey(cursor))) {
    current++
    cursor = new Date(cursor.getTime() - DAY_MS)
  }
  return { current, longest }
}

/** Lunes 00:00 local de la semana que contiene `ref`. */
export function startOfWeek(ref = new Date()): Date {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate())
  const dow = (d.getDay() + 6) % 7 // 0 = lunes
  return new Date(d.getTime() - dow * DAY_MS)
}

export interface TrainingStats {
  totalWorkouts: number
  totalVolumeKg: number
  totalDurationSec: number
  currentStreak: number
  longestStreak: number
  thisWeekCount: number
  dayKeys: Set<string>
}

/** Deriva las métricas base a partir de los entrenos finalizados. */
export function computeStats(workouts: Workout[]): TrainingStats {
  const finished = workouts.filter((w) => w.finishedAt)
  const dayKeys = new Set(finished.map((w) => localDayKey(w.startedAt)))
  const { current, longest } = computeStreak(dayKeys)
  const weekStart = startOfWeek().getTime()
  const thisWeekCount = finished.filter(
    (w) => new Date(w.startedAt).getTime() >= weekStart
  ).length
  const totalDurationSec = finished.reduce((sum, w) => {
    if (!w.finishedAt) return sum
    return sum + Math.max(0, (new Date(w.finishedAt).getTime() - new Date(w.startedAt).getTime()) / 1000)
  }, 0)

  return {
    totalWorkouts: finished.length,
    totalVolumeKg: finished.reduce((s, w) => s + (w.totalVolumeKg ?? 0), 0),
    totalDurationSec,
    currentStreak: current,
    longestStreak: longest,
    thisWeekCount,
    dayKeys,
  }
}
