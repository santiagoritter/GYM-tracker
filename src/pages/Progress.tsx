import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronDown, TrendingUp, Trophy } from 'lucide-react'
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
  type TooltipProps,
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
import StreakWeekCard from '@/components/gym/StreakWeekCard'
import RecentWorkouts from '@/components/gym/RecentWorkouts'
import { EmptyState, SectionHeader } from '@/components/ui/Card'
import AchievementsPanel from '@/components/gym/AchievementsPanel'
import ExerciseSelectSheet from '@/components/gym/ExerciseSelectSheet'
import { cn } from '@/lib/utils'

type Tab = 'summary' | 'charts' | 'month' | 'levels' | 'achievements' | 'photos' | 'prs' | 'history'

export default function Progress() {
  const [tab, setTab] = useState<Tab>('summary')

  return (
    <div className="mx-auto content-width space-y-4">
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
              'flex h-11 shrink-0 items-center whitespace-nowrap rounded-full px-3.5 text-sm font-semibold transition-colors',
              tab === key ? 'bg-accent text-bg' : 'text-ink-3 active:text-ink-2'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'summary' && (
        <div className="animate-fade-up space-y-4">
          {/* El anillo semanal se mudó desde Inicio (pedido explícito): es
              un resumen para revisar, no algo que compita con "qué entreno
              hoy". El heatmap de actividad se queda en Inicio. */}
          <StreakWeekCard />
          <StatsOverview />
          {/* RecentWorkouts vive acá, no en Inicio — mirar hacia atrás es
              revisión, no "qué entreno hoy", que es lo que resuelve Inicio. */}
          <section>
            <SectionHeader title="Últimos entrenos" />
            <RecentWorkouts />
          </section>
        </div>
      )}
      {tab === 'charts' && <Charts />}
      {tab === 'month' && <MonthlyStats />}
      {tab === 'levels' && (
        <div className="animate-fade-up space-y-6">
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
  const [pickerOpen, setPickerOpen] = useState(false)

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

  // Mejor set (peso, con sus reps) por entreno para el ejercicio
  // seleccionado — antes solo se guardaba el peso máximo, sin las reps que
  // lo acompañaban, así que el tooltip no podía mostrar "80kg x 5".
  const exerciseData = useMemo<ChartPoint[]>(() => {
    const byWorkout = new Map<string, { weightKg: number; reps: number }>()
    for (const s of exerciseSets ?? []) {
      if (s.completed !== 1 || s.isWarmup !== 0 || !workoutMap.has(s.workoutId)) continue
      const current = byWorkout.get(s.workoutId)
      if (!current || s.weightKg > current.weightKg) {
        byWorkout.set(s.workoutId, { weightKg: s.weightKg, reps: s.reps })
      }
    }
    const points = [...byWorkout.entries()]
      .map(([workoutId, best]) => {
        const workout = workoutMap.get(workoutId)!
        return {
          date: workout.startedAt,
          label: new Date(workout.startedAt).toLocaleDateString('es-AR', {
            day: 'numeric',
            month: 'numeric',
          }),
          kg: best.weightKg,
          reps: best.reps,
        }
      })
      .sort((a, b) => a.date.localeCompare(b.date))

    // PR = máximo histórico corriendo hasta ese punto, calculado en el
    // propio timeline local — no depende de PersonalRecord (que solo
    // guarda el récord ACTUAL, no el historial completo de mejoras) y por
    // eso puede marcar cada salto real de la serie, no solo el más
    // reciente.
    let running = 0
    return points.map((p) => {
      const isPR = p.kg > running
      if (isPR) running = p.kg
      return { ...p, isPR }
    })
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
      <EmptyState
        icon={<TrendingUp size={28} />}
        title="Sin datos todavía"
        description="Los gráficos aparecen cuando completes tu primer entreno."
      />
    )
  }

  return (
    <div className="space-y-6">
      <section className="animate-fade-up">
        <SectionHeader title="Mejor peso por entreno" />
        <button
          onClick={() => setPickerOpen(true)}
          className="mb-3 flex w-full items-center justify-between rounded-lg bg-surface px-3 py-2.5 text-left text-sm"
        >
          <span className="truncate font-medium">
            {trainedExercises.find((e) => e.id === effectiveExercise)?.name ?? 'Elegir ejercicio'}
          </span>
          <ChevronDown size={16} className="shrink-0 text-ink-3" />
        </button>
        {pickerOpen && (
          <ExerciseSelectSheet
            exercises={trainedExercises}
            selectedId={effectiveExercise}
            onSelect={(id) => {
              setSelectedExercise(id)
              setPickerOpen(false)
            }}
            onClose={() => setPickerOpen(false)}
          />
        )}
        <div className="h-56 rounded-xl bg-surface p-3">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={exerciseData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke={chartColors.axis} fontSize={11} />
              <YAxis stroke={chartColors.axis} fontSize={11} unit="" />
              <Tooltip content={<ExerciseTooltip />} cursor={{ stroke: chartColors.grid }} />
              <Line
                type="monotone"
                dataKey="kg"
                stroke={chartColors.accent}
                strokeWidth={2}
                dot={<ExerciseDot accent={chartColors.accent} hole={chartColors.surface} />}
                activeDot={{ r: 5, fill: chartColors.accent }}
                isAnimationActive
                animationDuration={500}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="animate-fade-up">
        <SectionHeader title="Volumen semanal (kg)" />
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

interface ChartPoint {
  date: string
  label: string
  kg: number
  reps: number
  isPR: boolean
}

/** Punto normal: círculo chico. Punto de PR: el mismo círculo con un
 * "hueco" en el medio (color del fondo de la tarjeta) — un anillo en vez
 * de un relleno más grande, para diferenciarlo sin sumar blur/glow
 * (DESIGN.md). */
function ExerciseDot({
  accent,
  hole,
  cx,
  cy,
  payload,
}: {
  accent: string
  hole: string
  cx?: number
  cy?: number
  payload?: ChartPoint
}) {
  if (cx === undefined || cy === undefined) return null
  if (!payload?.isPR) return <circle cx={cx} cy={cy} r={3} fill={accent} />
  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill={accent} />
      <circle cx={cx} cy={cy} r={2.5} fill={hole} />
    </g>
  )
}

/** Tooltip propio en vez del `contentStyle` genérico de Recharts: fecha
 * completa, peso × reps del mejor set, y una marca de PR cuando
 * corresponde — antes solo decía "80 kg · Mejor set", sin reps ni fecha
 * legible. */
function ExerciseTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload as ChartPoint | undefined
  if (!point) return null
  return (
    <div className="rounded-md border border-line-2 bg-surface-3 px-3 py-2 shadow-float">
      <p className="text-[12px] text-ink-3">
        {new Date(point.date).toLocaleDateString('es-AR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </p>
      <p className="font-mono text-sm font-bold tabular-nums">
        {point.kg} kg × {point.reps}
      </p>
      {point.isPR && (
        <p className="mt-0.5 flex items-center gap-1 text-[12px] font-bold text-accent">
          <Trophy size={11} /> Récord en ese momento
        </p>
      )}
    </div>
  )
}

function PRList() {
  const userId = useCurrentUserId()
  const prs = useLiveQuery(() => (userId ? personalRecordsFor(userId).toArray() : []), [userId]) ?? []
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) ?? []
  const exerciseMap = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises])

  const sorted = [...prs].sort((a, b) => b.oneRmKg - a.oneRmKg)

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={<Trophy size={28} />}
        title="Sin récords todavía"
        description="Tus récords personales aparecen acá al terminar entrenos."
      />
    )
  }

  return (
    <div className="animate-fade-up space-y-2">
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
