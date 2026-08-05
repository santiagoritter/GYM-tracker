import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronDown } from 'lucide-react'
import { db } from '@/db/schema'
import { workoutsFor, workoutSetsOf } from '@/db/scoped'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { Card, Row } from '@/components/ui/Card'
import { cn, formatDate, formatDuration } from '@/lib/utils'
import type { Workout } from '@/types'

/**
 * Últimos entrenos terminados.
 *
 * Vive en Progreso, no en Inicio: mirar hacia atrás es una actividad de
 * revisión, y la pantalla de inicio tiene que resolver "qué entreno hoy"
 * (Redisenio.md §3.3).
 *
 * Tap-to-reveal por fila (concepto adaptado del card-flip de kokonutui.com,
 * que en el original dispara por hover — no aplica a touch): en vez de un
 * flip 3D, que en esta app leería como decoración vistosa fuera de lugar,
 * se expande el detalle por ejercicio debajo de la fila. Mismo objetivo
 * (resumen al frente, detalle a un tap), lenguaje visual consistente con
 * el resto de la app (hairlines, sin transforms 3D).
 */
export default function RecentWorkouts({ limit = 8 }: { limit?: number }) {
  const userId = useCurrentUserId()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const workouts = useLiveQuery(
    () =>
      userId
        ? workoutsFor(userId)
            .filter((w) => Boolean(w.finishedAt))
            .toArray()
            .then((ws) =>
              ws.sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, limit)
            )
        : [],
    [userId, limit]
  )

  if (workouts === undefined) {
    return (
      <Card>
        {Array.from({ length: 3 }).map((_, i) => (
          <Row key={i}>
            <div className="w-full space-y-2">
              <div className="skeleton h-4 w-2/5 rounded-xs" />
              <div className="skeleton h-3 w-3/5 rounded-xs" />
            </div>
          </Row>
        ))}
      </Card>
    )
  }

  if (workouts.length === 0) {
    return (
      <Card>
        <Row>
          <p className="w-full py-2 text-center text-[14px] text-ink-3">
            Todavía no terminaste ningún entreno.
          </p>
        </Row>
      </Card>
    )
  }

  return (
    <Card>
      {workouts.map((w) => (
        <RecentWorkoutRow
          key={w.id}
          workout={w}
          expanded={expandedId === w.id}
          onToggle={() => setExpandedId((id) => (id === w.id ? null : w.id))}
        />
      ))}
    </Card>
  )
}

interface ExerciseSummary {
  id: string
  name: string
  setsCount: number
  bestKg: number
}

function RecentWorkoutRow({
  workout,
  expanded,
  onToggle,
}: {
  workout: Workout
  expanded: boolean
  onToggle: () => void
}) {
  // Solo consulta las series cuando la fila está expandida — el resto del
  // tiempo no hace falta el detalle de las otras 7 filas de la lista.
  const exercises = useLiveQuery<ExerciseSummary[] | undefined>(async () => {
    if (!expanded) return undefined
    const sets = await workoutSetsOf(workout.id).toArray()
    const byExercise = new Map<string, { setsCount: number; bestKg: number }>()
    for (const s of sets) {
      if (s.completed !== 1 || s.isWarmup === 1) continue
      const cur = byExercise.get(s.exerciseId) ?? { setsCount: 0, bestKg: 0 }
      cur.setsCount += 1
      cur.bestKg = Math.max(cur.bestKg, s.weightKg)
      byExercise.set(s.exerciseId, cur)
    }
    const ids = [...byExercise.keys()]
    const exs = await db.exercises.bulkGet(ids)
    return ids.map((id, i) => ({
      id,
      name: exs[i]?.name ?? '?',
      ...byExercise.get(id)!,
    }))
  }, [expanded, workout.id])

  return (
    <Row onClick={onToggle} className="flex-col items-stretch">
      <div className="flex w-full items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{workout.name}</p>
          <p className="mt-0.5 text-[13px] text-ink-2">
            {formatDuration(workout.startedAt, workout.finishedAt)}
            {workout.totalVolumeKg ? (
              <>
                {' · '}
                <span className="font-mono tabular-nums">
                  {Math.round(workout.totalVolumeKg).toLocaleString('es-AR')}
                </span>
                {' kg'}
              </>
            ) : null}
          </p>
        </div>
        <span className="shrink-0 text-[13px] text-ink-3">{formatDate(workout.startedAt)}</span>
        <ChevronDown
          size={16}
          className={cn('shrink-0 text-ink-3 transition-transform', expanded && 'rotate-180')}
        />
      </div>
      {expanded && (
        <div className="animate-fade-up mt-2 space-y-1.5 border-t border-line-2 pt-2">
          {exercises === undefined ? (
            <p className="text-[13px] text-ink-3">Cargando…</p>
          ) : exercises.length === 0 ? (
            <p className="text-[13px] text-ink-3">Sin series completadas.</p>
          ) : (
            exercises.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 text-[13px]">
                <span className="min-w-0 truncate text-ink-2">{e.name}</span>
                <span className="shrink-0 font-mono tabular-nums text-ink-3">
                  {e.setsCount}× · {e.bestKg} kg
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </Row>
  )
}
