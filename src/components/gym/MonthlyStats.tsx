import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { db } from '@/db/schema'
import { workoutsFor, personalRecordsFor } from '@/db/scoped'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import type { MuscleGroup } from '@/types'
import { MUSCLE_LABELS } from '@/components/gym/MuscleChip'

const MUSCLE_COLORS: Record<string, string> = {
  chest: '#F97316',
  back: '#3B82F6',
  shoulders: '#A855F7',
  biceps: '#EC4899',
  triceps: '#EC4899',
  forearms: '#EC4899',
  quads: '#10B981',
  hamstrings: '#10B981',
  glutes: '#EF4444',
  calves: '#10B981',
  core: '#F59E0B',
  cardio: '#06B6D4',
}

export function MonthlyStats() {
  const userId = useCurrentUserId()
  const [monthOffset, setMonthOffset] = useState(0)

  const workouts = useLiveQuery(
    () => (userId ? workoutsFor(userId).filter((w) => Boolean(w.finishedAt)).toArray() : []),
    [userId]
  )
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) ?? []
  const prs = useLiveQuery(
    () => (userId ? personalRecordsFor(userId).toArray() : []),
    [userId]
  ) ?? []

  const exerciseMap = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises])

  const { monthStart, monthEnd, monthLabel } = useMemo(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
    const end = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 1)
    return {
      monthStart: start,
      monthEnd: end,
      monthLabel: start.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }),
    }
  }, [monthOffset])

  const monthWorkouts = useMemo(
    () =>
      (workouts ?? []).filter((w) => {
        const d = new Date(w.startedAt)
        return d >= monthStart && d < monthEnd
      }),
    [workouts, monthStart, monthEnd]
  )

  // Solo los sets de los entrenos del mes, vía índice workoutId
  const monthAllSets =
    useLiveQuery(
      () =>
        monthWorkouts.length > 0
          ? db.workoutSets
              .where('workoutId')
              .anyOf(monthWorkouts.map((w) => w.id))
              .toArray()
          : [],
      [monthWorkouts]
    ) ?? []

  const stats = useMemo(() => {
    const inMonth = (iso: string) => {
      const d = new Date(iso)
      return d >= monthStart && d < monthEnd
    }
    const monthSets = monthAllSets.filter((s) => s.completed === 1 && s.isWarmup === 0)

    const totalVolume = monthWorkouts.reduce((sum, w) => sum + (w.totalVolumeKg ?? 0), 0)
    const uniqueExercises = new Set(monthSets.map((s) => s.exerciseId)).size
    const monthPRs = prs.filter((p) => inMonth(p.achievedAt)).length

    // Distribución muscular por volumen (los ejercicios multi-músculo reparten)
    const muscleVolume = new Map<MuscleGroup, number>()
    for (const s of monthSets) {
      const exercise = exerciseMap.get(s.exerciseId)
      if (!exercise) continue
      const setVolume = s.weightKg * s.reps
      const share = setVolume / exercise.musclePrimary.length
      for (const muscle of exercise.musclePrimary) {
        muscleVolume.set(muscle, (muscleVolume.get(muscle) ?? 0) + share)
      }
    }
    const distribution = [...muscleVolume.entries()]
      .map(([muscle, volume]) => ({
        muscle,
        name: MUSCLE_LABELS[muscle],
        value: Math.round(volume),
      }))
      .sort((a, b) => b.value - a.value)

    return {
      sessions: monthWorkouts.length,
      totalVolume: Math.round(totalVolume),
      uniqueExercises,
      monthPRs,
      distribution,
    }
  }, [monthWorkouts, monthAllSets, prs, exerciseMap, monthStart, monthEnd])

  // Mes anterior para comparativa
  const prevStats = useMemo(() => {
    const start = new Date(monthStart)
    start.setMonth(start.getMonth() - 1)
    const monthWorkouts = (workouts ?? []).filter((w) => {
      const d = new Date(w.startedAt)
      return d >= start && d < monthStart
    })
    return {
      sessions: monthWorkouts.length,
      totalVolume: Math.round(
        monthWorkouts.reduce((sum, w) => sum + (w.totalVolumeKg ?? 0), 0)
      ),
    }
  }, [workouts, monthStart])

  const diff = (current: number, prev: number) => {
    if (prev === 0) return null
    const pct = Math.round(((current - prev) / prev) * 100)
    return pct >= 0 ? `+${pct}%` : `${pct}%`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl bg-surface px-2 py-1.5">
        <button onClick={() => setMonthOffset((o) => o - 1)} className="p-2 text-ink-2">
          <ChevronLeft size={20} />
        </button>
        <span className="font-semibold capitalize">{monthLabel}</span>
        <button
          onClick={() => setMonthOffset((o) => Math.min(0, o + 1))}
          disabled={monthOffset === 0}
          className="p-2 text-ink-2 disabled:opacity-30"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatCard
          label="Sesiones"
          value={String(stats.sessions)}
          delta={diff(stats.sessions, prevStats.sessions)}
        />
        <StatCard
          label="Volumen total"
          value={`${stats.totalVolume.toLocaleString('es-AR')} kg`}
          delta={diff(stats.totalVolume, prevStats.totalVolume)}
        />
        <StatCard label="Ejercicios distintos" value={String(stats.uniqueExercises)} />
        <StatCard label="PRs del mes" value={String(stats.monthPRs)} />
      </div>

      {stats.distribution.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-2">
            Distribución muscular
          </h3>
          <div className="rounded-xl bg-surface p-3">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.distribution}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="55%"
                    outerRadius="85%"
                    paddingAngle={2}
                    stroke="none"
                  >
                    {stats.distribution.map((entry) => (
                      <Cell key={entry.muscle} fill={MUSCLE_COLORS[entry.muscle]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1C1C1C',
                      border: '1px solid #383838',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value) => [`${Number(value).toLocaleString('es-AR')} kg`]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {stats.distribution.map((entry) => (
                <span key={entry.muscle} className="flex items-center gap-1.5 text-xs text-ink-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: MUSCLE_COLORS[entry.muscle] }}
                  />
                  {entry.name}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {stats.sessions === 0 && (
        <p className="rounded-xl bg-surface p-8 text-center text-sm text-ink-3">
          Sin entrenos este mes.
        </p>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  delta,
}: {
  label: string
  value: string
  delta?: string | null
}) {
  return (
    <div className="rounded-xl bg-surface p-4">
      <p className="text-xs text-ink-3">{label}</p>
      <p className="mt-1 font-mono text-xl font-bold">{value}</p>
      {delta && (
        <p
          className={
            delta.startsWith('+') ? 'text-xs text-success' : 'text-xs text-danger'
          }
        >
          {delta} vs mes anterior
        </p>
      )}
    </div>
  )
}
