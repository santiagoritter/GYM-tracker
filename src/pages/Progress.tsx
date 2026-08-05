import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Trophy } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { db } from '@/db/schema'
import { workoutsFor, personalRecordsFor } from '@/db/scoped'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { useChartColors } from '@/hooks/useChartColors'
import { HistoryList } from '@/components/gym/HistoryList'
import { MonthlyStats } from '@/components/gym/MonthlyStats'
import { StrengthLevels } from '@/components/gym/StrengthLevels'
import { MuscleGroupLevels } from '@/components/gym/MuscleGroupLevels'
import { PhotoGallery } from '@/components/gym/PhotoGallery'
import StatsOverview from '@/components/gym/StatsOverview'
import RecentWorkouts from '@/components/gym/RecentWorkouts'
import { SectionHeader } from '@/components/ui/Card'
import AchievementsPanel from '@/components/gym/AchievementsPanel'
import { cn } from '@/lib/utils'

type Tab = 'summary' | 'charts' | 'month' | 'levels' | 'achievements' | 'photos' | 'prs' | 'history'

export default function Progress() {
  const [tab, setTab] = useState<Tab>('summary')

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Progreso</h1>

      <div className="-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none]">
        {(
          [
            ['summary', 'Resumen'],
            ['charts', 'Gráficos'],
            ['month', 'Mes'],
            ['levels', 'Niveles'],
            ['achievements', 'Logros'],
            ['photos', 'Fotos'],
            ['prs', 'PRs'],
            ['history', 'Historial'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors',
              tab === key ? 'border-accent bg-accent text-bg' : 'border-line-2 text-ink-3'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'summary' && (
        <div className="space-y-4">
          <StatsOverview />
          {/* El heatmap de actividad vive en Inicio, no acá (pedido
              explícito): es lo primero que se quiere ver al abrir la app,
              no algo que hay que venir a buscar a Progreso. RecentWorkouts
              sigue acá — mirar hacia atrás es revisión, no "qué entreno
              hoy", que es lo que resuelve Inicio. */}
          <section>
            <SectionHeader title="Últimos entrenos" />
            <RecentWorkouts />
          </section>
        </div>
      )}
      {tab === 'charts' && <Charts />}
      {tab === 'month' && <MonthlyStats />}
      {tab === 'levels' && (
        <div className="space-y-6">
          <StrengthLevels />
          <section>
            <SectionHeader title="Grupos musculares" />
            <MuscleGroupLevels />
          </section>
        </div>
      )}
      {tab === 'achievements' && <AchievementsPanel />}
      {tab === 'photos' && <PhotoGallery />}
      {tab === 'prs' && <PRList />}
      {tab === 'history' && <HistoryList />}
    </div>
  )
}

function Charts() {
  const userId = useCurrentUserId()
  const chartColors = useChartColors()
  const workouts = useLiveQuery(
    () => (userId ? workoutsFor(userId).filter((w) => Boolean(w.finishedAt)).toArray() : []),
    [userId]
  )
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) ?? []
  const [selectedExercise, setSelectedExercise] = useState<string>('')

  const workoutMap = useMemo(
    () => new Map((workouts ?? []).map((w) => [w.id, w])),
    [workouts]
  )

  // Ejercicios distintos entrenados por este usuario (workoutSets no tiene
  // userId directo, se cruza contra los workoutId ya scopeados).
  const trainedIds = useLiveQuery(async () => {
    const ownWorkoutIds = new Set((workouts ?? []).map((w) => w.id))
    const allSets = await db.workoutSets.toArray()
    return new Set(
      allSets.filter((s) => ownWorkoutIds.has(s.workoutId)).map((s) => s.exerciseId)
    )
  }, [workouts])

  const trainedExercises = useMemo(
    () =>
      exercises
        .filter((e) => trainedIds?.has(e.id))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [exercises, trainedIds]
  )

  const effectiveExercise = selectedExercise || trainedExercises[0]?.id || ''

  // Solo los sets del ejercicio seleccionado, vía índice
  const exerciseSets = useLiveQuery(
    () =>
      effectiveExercise
        ? db.workoutSets.where('exerciseId').equals(effectiveExercise).toArray()
        : [],
    [effectiveExercise]
  )

  // Mejor peso por entreno para el ejercicio seleccionado
  const exerciseData = useMemo(() => {
    const byWorkout = new Map<string, number>()
    for (const s of exerciseSets ?? []) {
      if (s.completed !== 1 || s.isWarmup !== 0 || !workoutMap.has(s.workoutId)) continue
      byWorkout.set(s.workoutId, Math.max(byWorkout.get(s.workoutId) ?? 0, s.weightKg))
    }
    return [...byWorkout.entries()]
      .map(([workoutId, maxKg]) => ({
        date: workoutMap.get(workoutId)!.startedAt,
        label: new Date(workoutMap.get(workoutId)!.startedAt).toLocaleDateString('es-AR', {
          day: 'numeric',
          month: 'numeric',
        }),
        kg: maxKg,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [exerciseSets, workoutMap])

  // Volumen por semana (últimas 8 semanas)
  const weeklyVolume = useMemo(() => {
    const weeks = new Map<string, number>()
    const now = new Date()
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i * 7)
      weeks.set(weekKey(d), 0)
    }
    for (const w of workouts ?? []) {
      const key = weekKey(new Date(w.startedAt))
      if (weeks.has(key)) {
        weeks.set(key, (weeks.get(key) ?? 0) + (w.totalVolumeKg ?? 0))
      }
    }
    return [...weeks.entries()].map(([label, kg]) => ({ label, kg: Math.round(kg) }))
  }, [workouts])

  if (trainedExercises.length === 0) {
    return (
      <p className="rounded-xl bg-surface p-8 text-center text-sm text-ink-3">
        Los gráficos aparecen cuando completes tu primer entreno.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-2">
          Mejor peso por entreno
        </h2>
        <select
          value={effectiveExercise}
          onChange={(e) => setSelectedExercise(e.target.value)}
          className="mb-3 w-full rounded-lg bg-surface px-3 py-2.5 text-sm outline-none"
        >
          {trainedExercises.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <div className="h-56 rounded-xl bg-surface p-3">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={exerciseData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke={chartColors.axis} fontSize={11} />
              <YAxis stroke={chartColors.axis} fontSize={11} unit="" />
              <Tooltip
                contentStyle={{
                  backgroundColor: chartColors.tooltipBg,
                  border: `1px solid ${chartColors.tooltipBorder}`,
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: chartColors.tooltipText }}
                formatter={(value) => [`${value} kg`, 'Mejor set']}
              />
              <Line
                type="monotone"
                dataKey="kg"
                stroke={chartColors.accent}
                strokeWidth={2}
                dot={{ fill: chartColors.accent, r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-2">
          Volumen semanal (kg)
        </h2>
        <div className="h-48 rounded-xl bg-surface p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyVolume} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" stroke={chartColors.axis} fontSize={10} />
              <YAxis stroke={chartColors.axis} fontSize={11} />
              <Tooltip
                cursor={{ fill: chartColors.cursor }}
                contentStyle={{
                  backgroundColor: chartColors.tooltipBg,
                  border: `1px solid ${chartColors.tooltipBorder}`,
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: chartColors.tooltipText }}
                formatter={(value) => [`${value} kg`, 'Volumen']}
              />
              <Bar dataKey="kg" fill={chartColors.accent} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}

/** Etiqueta de semana: "12/1" = lunes de esa semana. */
function weekKey(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? 6 : day - 1 // lunes como inicio
  d.setDate(d.getDate() - diff)
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric' })
}

function PRList() {
  const userId = useCurrentUserId()
  const prs = useLiveQuery(() => (userId ? personalRecordsFor(userId).toArray() : []), [userId]) ?? []
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) ?? []
  const exerciseMap = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises])

  const sorted = [...prs].sort((a, b) => b.oneRmKg - a.oneRmKg)

  if (sorted.length === 0) {
    return (
      <p className="rounded-xl bg-surface p-8 text-center text-sm text-ink-3">
        Tus récords personales aparecen acá al terminar entrenos.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {sorted.map((pr) => (
        <div key={pr.id} className="flex items-center justify-between rounded-xl bg-surface p-4">
          <div>
            <p className="font-medium">{exerciseMap.get(pr.exerciseId)?.name ?? pr.exerciseId}</p>
            <p className="text-xs text-ink-3">
              {new Date(pr.achievedAt).toLocaleDateString('es-AR')}
            </p>
          </div>
          <div className="text-right">
            <p className="flex items-center justify-end gap-1.5 font-mono text-lg font-bold text-accent">
              <Trophy size={14} /> {pr.weightKg} × {pr.reps}
            </p>
            <p className="text-xs text-ink-2">1RM est. {pr.oneRmKg} kg</p>
          </div>
        </div>
      ))}
    </div>
  )
}
