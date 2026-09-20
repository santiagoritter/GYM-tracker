import { Suspense, lazy, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronDown, Lock } from 'lucide-react'
import { db } from '@/db/schema'
import {
  fetchWorkoutSets,
  summarizeRests,
  type ClientProgress,
} from '@/lib/coachClientData'
import { ACHIEVEMENTS } from '@/lib/achievements'
import { computeStats, localDayKey, startOfWeek } from '@/lib/stats'
import { getMuscleGroupLevels } from '@/lib/muscleGroupStrength'
import { ageFromDob, GOAL_LABELS, LEVEL_LABELS } from '@/lib/strengthStandards'
import { formatHms } from '@/lib/cardio'
import { cn, formatWeight } from '@/lib/utils'
import type { WorkoutSet } from '@/types'
import { Card, EmptyState, Row, SectionHeader } from '@/components/ui/Card'
import AchievementIcon from '@/components/gym/AchievementIcon'
import { MuscleGroupRadar } from '@/components/gym/MuscleGroupRadar'
import { MUSCLE_LABELS } from '@/components/gym/MuscleChip'

const ClientCharts = lazy(() => import('@/components/gym/ClientCharts'))

export type ProgressTab =
  | 'resumen'
  | 'entrenos'
  | 'progreso'
  | 'medidas'
  | 'niveles'
  | 'logros'
  | 'descansos'
  | 'calorias'

const TAB_LABELS: Record<ProgressTab, string> = {
  resumen: 'Resumen',
  entrenos: 'Entrenos',
  progreso: 'Progreso',
  medidas: 'Medidas',
  niveles: 'Niveles',
  logros: 'Logros',
  descansos: 'Descansos',
  calorias: 'Calorías',
}

const DAY_MS = 86_400_000
const PAGE_SIZE = 20

/**
 * Progreso completo de un alumno, visto por su coach. Presentacional: recibe
 * los datos ya traídos (`fetchClientProgress`) y solo los calcula/dibuja.
 * Nada de fotos de progreso; las calorías aparecen solo si el alumno las
 * habilitó (`data.sharesCalories`).
 */
export default function ClientProgressView({
  clientId,
  data,
}: {
  clientId: string
  data: ClientProgress
}) {
  const [tab, setTab] = useState<ProgressTab>('resumen')
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) ?? []
  const exerciseName = useMemo(() => new Map(exercises.map((e) => [e.id, e.name])), [exercises])
  const units = data.profile?.units ?? 'kg'

  const tabs: ProgressTab[] = [
    'resumen',
    'entrenos',
    'progreso',
    'medidas',
    'niveles',
    'logros',
    'descansos',
    ...(data.sharesCalories ? (['calorias'] as const) : []),
  ]

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Secciones del progreso"
        className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              'h-11 shrink-0 rounded-full px-4 text-[14px] font-medium transition-colors',
              tab === t ? 'bg-accent text-bg' : 'bg-fill text-ink-2 active:bg-fill-2'
            )}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === 'resumen' && <Summary data={data} units={units} />}
      {tab === 'entrenos' && (
        <Workouts clientId={clientId} data={data} units={units} exerciseName={exerciseName} />
      )}
      {tab === 'progreso' && <Progress data={data} units={units} />}
      {tab === 'medidas' && <Measurements data={data} units={units} />}
      {tab === 'niveles' && <Levels data={data} exercises={exercises} exerciseName={exerciseName} units={units} />}
      {tab === 'logros' && <Achievements data={data} />}
      {tab === 'descansos' && <Rests data={data} exerciseName={exerciseName} />}
      {tab === 'calorias' && <Calories data={data} />}
    </div>
  )
}

// ── Resumen ────────────────────────────────────────────────────────────────

function Summary({ data, units }: { data: ClientProgress; units: 'kg' | 'lbs' }) {
  const stats = useMemo(() => computeStats(data.workouts), [data.workouts])
  const last = data.workouts[0]?.startedAt ?? null
  const daysSince = last ? Math.floor((Date.now() - new Date(last).getTime()) / DAY_MS) : null
  const hours = Math.round((stats.totalDurationSec / 3600) * 10) / 10
  const p = data.profile

  const cards = [
    { label: 'Entrenos', value: String(stats.totalWorkouts) },
    { label: 'Volumen', value: `${Math.round(stats.totalVolumeKg / 100) / 10} t` },
    { label: 'Tiempo', value: `${hours} h` },
    { label: 'Racha', value: `${stats.currentStreak} d` },
    { label: 'Esta semana', value: p?.weeklyGoal ? `${stats.thisWeekCount}/${p.weeklyGoal}` : String(stats.thisWeekCount) },
    { label: 'PRs', value: String(data.prs.length) },
  ]

  return (
    <div className="space-y-4">
      {daysSince != null && daysSince >= 7 && (
        <p className="rounded-md bg-warning/10 px-4 py-3 text-[14px] text-warning">
          Hace {daysSince} días que no entrena.
        </p>
      )}
      {daysSince == null && (
        <p className="rounded-md bg-surface px-4 py-3 text-[14px] text-ink-3">
          Todavía no registró ningún entreno terminado.
        </p>
      )}
      <div className="grid grid-cols-3 gap-2">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl bg-surface p-3">
            <p className="font-mono text-lg font-bold leading-none tabular-nums">{c.value}</p>
            <p className="mt-1 text-xs text-ink-3">{c.label}</p>
          </div>
        ))}
      </div>

      <section>
        <SectionHeader title="Ficha física" />
        {p ? (
          <Card>
            <InfoRow label="Objetivo" value={p.goal ? (GOAL_LABELS[p.goal as keyof typeof GOAL_LABELS] ?? p.goal) : null} />
            <InfoRow label="Nivel" value={p.level ? (LEVEL_LABELS[p.level as keyof typeof LEVEL_LABELS] ?? p.level) : null} />
            <InfoRow label="Edad" value={p.dob ? `${ageFromDob(p.dob)} años` : null} />
            <InfoRow label="Sexo" value={p.sex === 'male' ? 'Hombre' : p.sex === 'female' ? 'Mujer' : null} />
            <InfoRow label="Peso" value={p.bodyWeightKg != null ? `${formatWeight(p.bodyWeightKg, units)} ${units}` : null} />
            <InfoRow label="Altura" value={p.heightCm != null ? `${p.heightCm} cm` : null} />
            <InfoRow label="% grasa" value={p.bodyFatPct != null ? `${p.bodyFatPct}%` : null} />
          </Card>
        ) : (
          <p className="rounded-md bg-surface px-4 py-6 text-center text-sm text-ink-3">
            El alumno todavía no completó su ficha.
          </p>
        )}
      </section>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <Row>
      <span className="min-w-0 flex-1 text-[15px] text-ink-2">{label}</span>
      <span className={cn('text-[15px]', value ? 'font-medium' : 'text-ink-3')}>{value ?? '—'}</span>
    </Row>
  )
}

// ── Entrenos ───────────────────────────────────────────────────────────────

function Workouts({
  clientId,
  data,
  units,
  exerciseName,
}: {
  clientId: string
  data: ClientProgress
  units: 'kg' | 'lbs'
  exerciseName: Map<string, string>
}) {
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [openId, setOpenId] = useState<string | null>(null)
  const [sets, setSets] = useState<
    Record<string, { status: 'loading' } | { status: 'error' } | { status: 'ok'; rows: WorkoutSet[] }>
  >({})

  if (data.workouts.length === 0) {
    return (
      <EmptyState title="Sin entrenos" description="Cuando el alumno termine un entreno, aparece acá." />
    )
  }

  const toggle = (workoutId: string) => {
    if (openId === workoutId) return setOpenId(null)
    setOpenId(workoutId)
    if (sets[workoutId]) return
    setSets((prev) => ({ ...prev, [workoutId]: { status: 'loading' } }))
    fetchWorkoutSets(clientId, workoutId)
      .then((rows) => setSets((prev) => ({ ...prev, [workoutId]: { status: 'ok', rows } })))
      .catch(() => setSets((prev) => ({ ...prev, [workoutId]: { status: 'error' } })))
  }

  return (
    <div className="space-y-2">
      <Card>
        {data.workouts.slice(0, limit).map((w) => {
          const open = openId === w.id
          const durationSec = w.finishedAt
            ? Math.max(0, (new Date(w.finishedAt).getTime() - new Date(w.startedAt).getTime()) / 1000)
            : 0
          const isStrength = (w.kind ?? 'strength') === 'strength'
          return (
            <div key={w.id}>
              <Row onClick={() => toggle(w.id)} className="items-start">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium">{w.name}</p>
                  <p className="text-[13px] text-ink-3">
                    {new Date(w.startedAt).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}
                    {durationSec > 0 && ` · ${formatHms(durationSec)}`}
                    {isStrength && w.totalVolumeKg ? ` · ${formatWeight(w.totalVolumeKg, units)} ${units}` : ''}
                  </p>
                </div>
                <ChevronDown
                  size={18}
                  className={cn('mt-1 shrink-0 text-ink-3 transition-transform', open && 'rotate-180')}
                />
              </Row>
              {open && (
                <div className="space-y-2 bg-surface-2 px-4 py-3 text-[14px]">
                  {!isStrength && <p className="text-ink-2">{w.notes ?? 'Sin detalles.'}</p>}
                  {isStrength && (
                    <SetList state={sets[w.id]} units={units} exerciseName={exerciseName} />
                  )}
                  {isStrength && w.notes && <p className="text-ink-3">Nota: {w.notes}</p>}
                </div>
              )}
            </div>
          )
        })}
      </Card>
      {data.workouts.length > limit && (
        <button
          onClick={() => setLimit((l) => l + PAGE_SIZE)}
          className="h-11 w-full rounded-sm bg-fill text-sm font-semibold text-ink-2"
        >
          Ver más
        </button>
      )}
    </div>
  )
}

function SetList({
  state,
  units,
  exerciseName,
}: {
  state: { status: 'loading' } | { status: 'error' } | { status: 'ok'; rows: WorkoutSet[] } | undefined
  units: 'kg' | 'lbs'
  exerciseName: Map<string, string>
}) {
  if (!state || state.status === 'loading') return <p className="text-ink-3">Cargando series…</p>
  if (state.status === 'error') return <p className="text-danger">No se pudieron cargar las series.</p>
  const done = state.rows.filter((s) => s.completed === 1)
  if (done.length === 0) return <p className="text-ink-3">Sin series completadas.</p>

  const byExercise = new Map<string, WorkoutSet[]>()
  for (const s of done) byExercise.set(s.exerciseId, [...(byExercise.get(s.exerciseId) ?? []), s])

  return (
    <div className="space-y-2.5">
      {[...byExercise.entries()].map(([exerciseId, list]) => (
        <div key={exerciseId}>
          <p className="font-medium">{exerciseName.get(exerciseId) ?? 'Ejercicio'}</p>
          <p className="text-[13px] leading-relaxed text-ink-2">
            {list
              .map((s) => `${s.isWarmup === 1 ? 'cal. ' : ''}${s.reps}×${formatWeight(s.weightKg, units)}`)
              .join('  ·  ')}{' '}
            {units}
          </p>
        </div>
      ))}
    </div>
  )
}

// ── Progreso ───────────────────────────────────────────────────────────────

function Progress({ data, units }: { data: ClientProgress; units: 'kg' | 'lbs' }) {
  const weeklyVolume = useMemo(() => {
    const byWeek = new Map<number, number>()
    for (const w of data.workouts) {
      const key = startOfWeek(new Date(w.startedAt)).getTime()
      byWeek.set(key, (byWeek.get(key) ?? 0) + (w.totalVolumeKg ?? 0))
    }
    return [...byWeek.entries()]
      .sort((a, b) => a[0] - b[0])
      .slice(-12)
      .map(([ts, kg]) => ({
        label: new Date(ts).toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric' }),
        kg: Math.round(units === 'lbs' ? kg * 2.20462 : kg),
      }))
  }, [data.workouts, units])

  const bodyWeight = useMemo(
    () =>
      data.measurements
        .filter((m) => m.weightKg != null)
        .sort((a, b) => a.takenAt.localeCompare(b.takenAt))
        .slice(-24)
        .map((m) => ({
          label: new Date(m.takenAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric' }),
          kg: Number(formatWeight(m.weightKg!, units)),
        })),
    [data.measurements, units]
  )

  return (
    <Suspense fallback={<p className="py-12 text-center text-sm text-ink-3">Cargando gráficos…</p>}>
      <ClientCharts weeklyVolume={weeklyVolume} bodyWeight={bodyWeight} units={units} />
    </Suspense>
  )
}

// ── Medidas ────────────────────────────────────────────────────────────────

function Measurements({ data, units }: { data: ClientProgress; units: 'kg' | 'lbs' }) {
  const rows = [...data.measurements].sort((a, b) => b.takenAt.localeCompare(a.takenAt)).slice(0, 12)
  if (rows.length === 0) {
    return <EmptyState title="Sin medidas" description="El alumno todavía no cargó medidas corporales." />
  }
  return (
    <Card>
      {rows.map((m) => {
        const parts = [
          m.weightKg != null && `Peso ${formatWeight(m.weightKg, units)} ${units}`,
          m.bodyFatPct != null && `Grasa ${m.bodyFatPct}%`,
          m.chestCm != null && `Pecho ${m.chestCm}`,
          m.waistCm != null && `Cintura ${m.waistCm}`,
          m.hipsCm != null && `Cadera ${m.hipsCm}`,
          m.armCm != null && `Brazo ${m.armCm}`,
          m.thighCm != null && `Muslo ${m.thighCm}`,
        ].filter(Boolean)
        return (
          <Row key={m.id} className="flex-col items-stretch gap-0.5">
            <p className="text-[15px] font-medium">
              {new Date(m.takenAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <p className="text-[13px] leading-relaxed text-ink-2">{parts.join(' · ') || 'Sin datos'}</p>
            {m.notes && <p className="text-[13px] text-ink-3">{m.notes}</p>}
          </Row>
        )
      })}
    </Card>
  )
}

// ── Niveles ────────────────────────────────────────────────────────────────

function Levels({
  data,
  exercises,
  exerciseName,
  units,
}: {
  data: ClientProgress
  exercises: import('@/types').Exercise[]
  exerciseName: Map<string, string>
  units: 'kg' | 'lbs'
}) {
  const p = data.profile
  const levels = useMemo(() => {
    if (!p?.sex || !p.bodyWeightKg || !p.dob) return []
    return getMuscleGroupLevels(
      exercises,
      new Map(data.prs.map((pr) => [pr.exerciseId, pr])),
      p.bodyWeightKg,
      p.sex,
      ageFromDob(p.dob)
    )
  }, [exercises, data.prs, p])

  const topPrs = useMemo(() => [...data.prs].sort((a, b) => b.oneRmKg - a.oneRmKg).slice(0, 10), [data.prs])

  return (
    <div className="space-y-5">
      {levels.length === 0 ? (
        <p className="rounded-md bg-surface px-4 py-6 text-center text-sm text-ink-3">
          Para calcular niveles hace falta que el alumno complete sexo, peso y fecha de nacimiento.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="h-64 rounded-xl bg-surface p-2">
            <MuscleGroupRadar levels={levels} />
          </div>
          <Card>
            {levels.map(({ muscle, result }) => (
              <Row key={muscle} className="flex-col items-stretch gap-1.5">
                <div className="flex w-full items-center justify-between">
                  <span className="text-[15px]">{MUSCLE_LABELS[muscle]}</span>
                  <span className={result.level === 'no_data' ? 'text-[13px] text-ink-3' : 'text-[13px] font-medium text-ink'}>
                    {LEVEL_LABELS[result.level]}
                  </span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-surface-3">
                  <div
                    className="h-full origin-left rounded-full bg-ink-2"
                    style={{ transform: `scaleX(${result.progress})` }}
                  />
                </div>
              </Row>
            ))}
          </Card>
        </div>
      )}

      <section>
        <SectionHeader title="Mejores marcas (1RM estimado)" />
        {topPrs.length === 0 ? (
          <p className="rounded-md bg-surface px-4 py-6 text-center text-sm text-ink-3">Sin récords todavía.</p>
        ) : (
          <Card>
            {topPrs.map((pr) => (
              <Row key={pr.id}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px]">{exerciseName.get(pr.exerciseId) ?? 'Ejercicio'}</p>
                  <p className="text-[13px] text-ink-3">
                    {pr.reps}×{formatWeight(pr.weightKg, units)} {units} ·{' '}
                    {new Date(pr.achievedAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-[15px] font-semibold tabular-nums">
                  {formatWeight(pr.oneRmKg, units)} {units}
                </span>
              </Row>
            ))}
          </Card>
        )}
      </section>
    </div>
  )
}

// ── Logros ─────────────────────────────────────────────────────────────────

function Achievements({ data }: { data: ClientProgress }) {
  const unlocked = new Set(data.achievementIds)
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-2">
        <span className="font-mono text-accent">{unlocked.size}/{ACHIEVEMENTS.length}</span> desbloqueados
      </p>
      <div className="grid grid-cols-2 gap-2">
        {ACHIEVEMENTS.map((a) => {
          const has = unlocked.has(a.id)
          return (
            <div
              key={a.id}
              className={cn(
                'flex items-center gap-3 rounded-xl border p-3',
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

// ── Descansos ──────────────────────────────────────────────────────────────

function Rests({ data, exerciseName }: { data: ClientProgress; exerciseName: Map<string, string> }) {
  const rows = useMemo(() => summarizeRests(data.restLogs), [data.restLogs])
  if (rows.length === 0) {
    return (
      <EmptyState
        title="Sin descansos registrados"
        description="Se llena a medida que el alumno confirma sus descansos entre series."
      />
    )
  }
  return (
    <Card>
      {rows.map((r) => (
        <Row key={r.exerciseId}>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px]">{exerciseName.get(r.exerciseId) ?? r.exerciseName ?? 'Ejercicio'}</p>
            <p className="text-[13px] text-ink-3">
              {r.samples} registro{r.samples === 1 ? '' : 's'} · planeado {formatHms(r.plannedSeconds)}
            </p>
          </div>
          <span className="shrink-0 font-mono text-[15px] font-semibold tabular-nums">
            {formatHms(r.medianSeconds)}
          </span>
        </Row>
      ))}
    </Card>
  )
}

// ── Calorías (solo con permiso del alumno) ─────────────────────────────────

function Calories({ data }: { data: ClientProgress }) {
  const days = useMemo(() => {
    const byDay = new Map<string, number>()
    for (const c of data.calories) {
      const key = localDayKey(c.loggedAt)
      byDay.set(key, (byDay.get(key) ?? 0) + c.kcal)
    }
    return [...byDay.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 14)
  }, [data.calories])

  if (days.length === 0) {
    return <EmptyState title="Sin registros" description="El alumno habilitó las calorías pero todavía no cargó ninguna." />
  }
  return (
    <div className="space-y-2">
      <p className="text-[13px] text-ink-3">Últimos 14 días con registro. Lo ves porque el alumno lo habilitó.</p>
      <Card>
        {days.map(([day, kcal]) => (
          <Row key={day}>
            <span className="min-w-0 flex-1 text-[15px]">
              {new Date(`${day}T12:00:00`).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
            <span className="font-mono text-[15px] font-semibold tabular-nums">{Math.round(kcal)} kcal</span>
          </Row>
        ))}
      </Card>
    </div>
  )
}
