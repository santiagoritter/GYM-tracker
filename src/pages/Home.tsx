import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, Play, Flame } from 'lucide-react'
import { routinesFor, routineDaysOf, workoutsFor } from '@/db/scoped'
import { startWorkoutFromDay } from '@/db/routines'
import { useWorkoutStore } from '@/stores/workoutStore'
import { useAuthStore } from '@/stores/authStore'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { HOME_MESSAGES } from '@/lib/motivational'
import { formatDate, formatDuration } from '@/lib/utils'
import StreakWeekCard from '@/components/gym/StreakWeekCard'
import { WorkoutCardSkeleton } from '@/components/ui/Skeleton'

export default function Home() {
  const navigate = useNavigate()
  const startWorkout = useWorkoutStore((s) => s.startWorkout)
  const { name } = useAuthStore()
  const userId = useCurrentUserId()
  const quote = useMemo(() => HOME_MESSAGES[Math.floor(Math.random() * HOME_MESSAGES.length)], [])

  const activeWorkout = useLiveQuery(
    () => (userId ? workoutsFor(userId).filter((w) => !w.finishedAt).first() : undefined),
    [userId]
  )
  const recentWorkouts = useLiveQuery(
    () =>
      userId
        ? workoutsFor(userId)
            .filter((w) => Boolean(w.finishedAt))
            .toArray()
            .then((ws) =>
              ws.sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 3)
            )
        : [],
    [userId]
  )
  const activeRoutine = useLiveQuery(
    () =>
      userId
        ? routinesFor(userId).filter((r) => r.isActive === 1 && r.isArchived === 0).first()
        : undefined,
    [userId]
  )
  const routineDays = useLiveQuery(
    () => (activeRoutine ? routineDaysOf(activeRoutine.id).sortBy('dayOrder') : []),
    [activeRoutine?.id]
  )

  const handleStart = async () => {
    if (!userId) return
    const name = new Date().toLocaleDateString('es-AR', { weekday: 'long' })
    const id = await startWorkout(userId, `Entreno del ${name}`)
    navigate(`/entreno/${id}`)
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">
          ¡Hola, {name?.split(' ')[0] ?? 'campeón'}!
        </h1>
        <p className="text-sm text-ink-2">
          {new Date().toLocaleDateString('es-AR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </p>
      </header>

      {/* Racha + meta semanal */}
      <StreakWeekCard />

      {/* Frase motivacional del día */}
      <blockquote className="rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-sm italic text-ink-2">
        "{quote.text}"
        {quote.author && (
          <footer className="mt-1 text-xs not-italic text-ink-3">— {quote.author}</footer>
        )}
      </blockquote>

      {activeWorkout ? (
        <button
          onClick={() => navigate(`/entreno/${activeWorkout.id}`)}
          className="flex w-full items-center justify-between rounded-2xl border border-accent/40 bg-accent/10 p-5 text-left"
        >
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-accent">
              <Flame size={16} /> Entreno en curso
            </p>
            <p className="mt-1 font-medium">{activeWorkout.name}</p>
            <p className="text-sm text-ink-2">{formatDuration(activeWorkout.startedAt)}</p>
          </div>
          <ChevronRight className="text-accent" />
        </button>
      ) : (
        <button
          onClick={handleStart}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-5 text-lg font-bold text-bg active:bg-accent-dim"
        >
          <Play size={22} fill="currentColor" /> Iniciar entrenamiento
        </button>
      )}

      {activeRoutine && !activeWorkout && (routineDays?.length ?? 0) > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: activeRoutine.color }}
            />
            {activeRoutine.name}
          </h2>
          <div className="space-y-1.5">
            {routineDays!.map((day) => (
              <div
                key={day.id}
                className="flex items-center justify-between rounded-lg bg-surface px-3 py-2.5"
              >
                <span className={day.isRest === 1 ? 'text-sm text-ink-3' : 'text-sm'}>
                  {day.name}
                  {day.isRest === 1 && ' · descanso'}
                </span>
                {day.isRest === 0 && (
                  <button
                    onClick={async () => {
                      if (!userId) return
                      const id = await startWorkoutFromDay(userId, day.id)
                      navigate(`/entreno/${id}`)
                    }}
                    className="flex items-center gap-1 rounded-md bg-accent px-2.5 py-1 text-xs font-bold text-bg"
                  >
                    <Play size={12} fill="currentColor" /> Entrenar
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-2">
          Últimos entrenos
        </h2>
        <div className="space-y-2">
          {recentWorkouts === undefined &&
            Array.from({ length: 2 }).map((_, i) => <WorkoutCardSkeleton key={i} />)}
          {(recentWorkouts ?? []).map((w) => (
            <div key={w.id} className="rounded-xl bg-surface p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">{w.name}</p>
                <span className="text-xs text-ink-3">{formatDate(w.startedAt)}</span>
              </div>
              <p className="mt-1 text-sm text-ink-2">
                {formatDuration(w.startedAt, w.finishedAt)} ·{' '}
                <span className="font-mono">{Math.round(w.totalVolumeKg ?? 0)}</span> kg de
                volumen
              </p>
            </div>
          ))}
          {recentWorkouts?.length === 0 && (
            <p className="rounded-xl bg-surface p-6 text-center text-sm text-ink-3">
              Todavía no registraste ningún entreno.
              <br />
              Arrancá con el botón de arriba 💪
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
