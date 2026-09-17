import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChevronDown, Pencil, Timer, TrendingUp, Trash2 } from 'lucide-react'
import { db } from '@/db/schema'
import { softDelete } from '@/db/mutations'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { useChartColors } from '@/hooks/useChartColors'
import { suggestRestSeconds } from '@/lib/restRecommendation'
import { formatHms } from '@/lib/cardio'
import { formatDate } from '@/lib/utils'
import ExerciseSelectSheet from '@/components/gym/ExerciseSelectSheet'
import ResponsiveSheet from '@/components/ui/ResponsiveSheet'
import DraftNumberInput from '@/components/ui/DraftNumberInput'
import { EmptyState, SectionHeader } from '@/components/ui/Card'
import type { RestLog } from '@/types'

/**
 * Analytics de descanso (TimeCounter): gráfico planeado vs. real por
 * ejercicio, sugerencia de un nuevo tiempo de descanso cuando el historial
 * lo justifica, e historial editable. Depende de `restLogs`, que solo
 * existe desde que RestOvertimeCard empezó a escribirlo (Bloque 5) — un
 * usuario sin descansos resueltos todavía ve el estado vacío.
 */
export function RestAnalytics() {
  const userId = useCurrentUserId()
  const chartColors = useChartColors()
  const profile = useLiveQuery(() => (userId ? db.profile.get(userId) : undefined), [userId])

  const allLogs = useLiveQuery(
    () => (userId ? db.restLogs.where('userId').equals(userId).toArray() : []),
    [userId]
  ) ?? []
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) ?? []
  const exerciseMap = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises])

  const loggedExerciseIds = useMemo(
    () => new Set(allLogs.map((l) => l.exerciseId)),
    [allLogs]
  )
  const loggedExercises = useMemo(
    () =>
      exercises
        .filter((e) => loggedExerciseIds.has(e.id))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [exercises, loggedExerciseIds]
  )

  const [selectedExercise, setSelectedExercise] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [editing, setEditing] = useState<RestLog | null>(null)

  const effectiveExercise = selectedExercise || loggedExercises[0]?.id || ''

  const exerciseLogs = useMemo(
    () =>
      allLogs
        .filter((l) => l.exerciseId === effectiveExercise)
        .sort((a, b) => a.loggedAt.localeCompare(b.loggedAt)),
    [allLogs, effectiveExercise]
  )

  // El descanso configurado hoy para este ejercicio: cualquier
  // RoutineExercise que lo use (puede estar en varias rutinas/días — se
  // toma el primero como referencia), o el default global si no está en
  // ninguna rutina. Filtrado en memoria, no `.where('exerciseId')`: esa
  // tabla nunca indexó ese campo (solo id/dayId/userId/exerciseOrder/dirty
  // — ver schema.ts), un `.where()` sobre un keyPath no indexado tira en
  // tiempo de ejecución ("KeyPath exerciseId on object store
  // routineExercises..."). Es una tabla chica (rutinas de un usuario), un
  // filtro en memoria no pesa nada.
  const allRoutineExercises = useLiveQuery(() => db.routineExercises.toArray(), []) ?? []
  const routineEntries = useMemo(
    () => allRoutineExercises.filter((e) => e.exerciseId === effectiveExercise),
    [allRoutineExercises, effectiveExercise]
  )
  const currentSeconds = routineEntries[0]?.restSeconds ?? profile?.restTimerDefault ?? 90

  const suggestion = useMemo(
    () => suggestRestSeconds(exerciseLogs, currentSeconds),
    [exerciseLogs, currentSeconds]
  )

  const applySuggestion = async () => {
    if (!suggestion || routineEntries.length === 0) return
    await Promise.all(
      routineEntries.map((e) =>
        db.routineExercises.update(e.id, { restSeconds: suggestion.medianSeconds })
      )
    )
  }

  const chartData = useMemo(
    () =>
      exerciseLogs.slice(-20).map((l) => ({
        label: new Date(l.loggedAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric' }),
        planeado: l.plannedSeconds,
        real: l.actualSeconds,
      })),
    [exerciseLogs]
  )

  const recentHistory = useMemo(
    () => [...allLogs].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt)).slice(0, 30),
    [allLogs]
  )

  if (allLogs.length === 0) {
    return (
      <EmptyState
        icon={<Timer size={28} />}
        title="Sin datos de descanso todavía"
        description="Cuando termines un descanso desde la card de sobretiempo, vas a ver acá cuánto descansás realmente."
      />
    )
  }

  return (
    <div className="animate-fade-up space-y-6">
      <section>
        <SectionHeader title="Planeado vs. real" />
        <button
          onClick={() => setPickerOpen(true)}
          className="mb-3 flex w-full items-center justify-between rounded-lg bg-surface px-3 py-2.5 text-left text-sm"
        >
          <span className="truncate font-medium">
            {exerciseMap.get(effectiveExercise)?.name ?? 'Elegir ejercicio'}
          </span>
          <ChevronDown size={16} className="shrink-0 text-ink-3" />
        </button>
        {pickerOpen && (
          <ExerciseSelectSheet
            exercises={loggedExercises}
            selectedId={effectiveExercise}
            onSelect={(id) => {
              setSelectedExercise(id)
              setPickerOpen(false)
            }}
            onClose={() => setPickerOpen(false)}
          />
        )}

        {suggestion && routineEntries.length > 0 && (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-accent/10 p-3.5">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-accent">
                <TrendingUp size={15} /> Descansás {formatHms(suggestion.medianSeconds)} en promedio
              </p>
              <p className="mt-0.5 text-xs text-ink-2">
                Hoy está fijado en {formatHms(suggestion.currentSeconds)} ({suggestion.sampleSize}{' '}
                {suggestion.sampleSize === 1 ? 'descanso' : 'descansos'} recientes)
              </p>
            </div>
            <button
              onClick={applySuggestion}
              className="h-9 shrink-0 rounded-sm bg-accent px-3 text-xs font-bold text-bg active:bg-accent-dim"
            >
              Actualizar
            </button>
          </div>
        )}

        <div className="h-52 rounded-xl bg-surface p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
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
                formatter={(value, name) => [formatHms(Number(value)), name]}
              />
              <Bar dataKey="planeado" fill={chartColors.axis} radius={[4, 4, 0, 0]} />
              <Bar dataKey="real" fill={chartColors.accent} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section>
        <SectionHeader title="Historial de descansos" />
        <div className="space-y-2">
          {recentHistory.map((log) => (
            <button
              key={log.id}
              onClick={() => setEditing(log)}
              className="flex w-full items-center justify-between rounded-xl bg-surface px-4 py-3 text-left"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {exerciseMap.get(log.exerciseId)?.name ?? 'Ejercicio'}
                </p>
                <p className="text-xs text-ink-3">{formatDate(log.loggedAt)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <p className="font-mono text-sm tabular-nums text-ink-2">
                  {formatHms(log.actualSeconds)}
                  {log.discarded === 1 && <span className="ml-1.5 text-ink-3">(descartado)</span>}
                </p>
                <Pencil size={14} className="text-ink-3" />
              </div>
            </button>
          ))}
        </div>
      </section>

      {editing && (
        <RestLogEditSheet
          log={editing}
          exerciseName={exerciseMap.get(editing.exerciseId)?.name}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

function RestLogEditSheet({
  log,
  exerciseName,
  onClose,
}: {
  log: RestLog
  exerciseName?: string
  onClose: () => void
}) {
  return (
    <ResponsiveSheet onClose={onClose}>
      <div className="px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-5">
        <h2 className="text-lg font-bold">{exerciseName ?? 'Ejercicio'}</h2>
        <p className="mt-0.5 text-sm text-ink-3">{formatDate(log.loggedAt)}</p>

        <label className="mt-5 flex items-center justify-between gap-3 text-sm text-ink-2">
          Descanso real (segundos)
          <DraftNumberInput
            value={log.actualSeconds}
            onCommit={(n) => db.restLogs.update(log.id, { actualSeconds: Math.max(0, n) })}
            className="h-11 w-24 rounded-xs bg-surface-2 text-center font-mono font-bold tabular-nums outline-none focus:ring-1 focus:ring-accent"
          />
        </label>
        <p className="mt-1.5 text-xs text-ink-3">Planeado: {formatHms(log.plannedSeconds)}</p>

        <button
          onClick={async () => {
            await softDelete('restLogs', log.id)
            onClose()
          }}
          className="mt-6 flex h-11 w-full items-center justify-center gap-1.5 rounded-sm border border-line-2 text-sm font-medium text-danger active:bg-surface-2"
        >
          <Trash2 size={16} /> Eliminar registro
        </button>
      </div>
    </ResponsiveSheet>
  )
}
