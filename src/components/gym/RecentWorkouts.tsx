import { useLiveQuery } from 'dexie-react-hooks'
import { workoutsFor } from '@/db/scoped'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { Card, Row } from '@/components/ui/Card'
import { formatDate, formatDuration } from '@/lib/utils'

/**
 * Últimos entrenos terminados.
 *
 * Vive en Progreso, no en Inicio: mirar hacia atrás es una actividad de
 * revisión, y la pantalla de inicio tiene que resolver "qué entreno hoy"
 * (Redisenio.md §3.3).
 */
export default function RecentWorkouts({ limit = 8 }: { limit?: number }) {
  const userId = useCurrentUserId()

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
        <Row key={w.id}>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{w.name}</p>
            <p className="mt-0.5 text-[13px] text-ink-2">
              {formatDuration(w.startedAt, w.finishedAt)}
              {w.totalVolumeKg ? (
                <>
                  {' · '}
                  <span className="font-mono tabular-nums">
                    {Math.round(w.totalVolumeKg).toLocaleString('es-AR')}
                  </span>
                  {' kg'}
                </>
              ) : null}
            </p>
          </div>
          <span className="shrink-0 text-[13px] text-ink-3">{formatDate(w.startedAt)}</span>
        </Row>
      ))}
    </Card>
  )
}
