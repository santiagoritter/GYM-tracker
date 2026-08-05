import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, Play, Flame } from 'lucide-react'
import { routinesFor, routineDaysOf, workoutsFor } from '@/db/scoped'
import { nextRoutineDay, startWorkoutFromDay } from '@/db/routines'
import { useWorkoutStore } from '@/stores/workoutStore'
import { useAuthStore } from '@/stores/authStore'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { HOME_MESSAGES } from '@/lib/motivational'
import { cn, formatDuration } from '@/lib/utils'
import StreakWeekCard from '@/components/gym/StreakWeekCard'
import CalorieSummaryRow from '@/components/gym/CalorieSummaryRow'
import { Card, Row, SectionHeader } from '@/components/ui/Card'

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

  // Qué día propone el botón grande. Antes arrancaba SIEMPRE un entreno
  // vacío, ignorando la rutina favorita — y ese camino es además el único
  // que precarga ejercicios y pesos sugeridos.
  const nextDay = useLiveQuery(
    () => (userId && activeRoutine ? nextRoutineDay(userId, activeRoutine.id) : undefined),
    [userId, activeRoutine?.id]
  )

  const handleStart = async () => {
    if (!userId) return
    if (nextDay) {
      const id = await startWorkoutFromDay(userId, nextDay.id)
      navigate(`/entreno/${id}`)
      return
    }
    const name = new Date().toLocaleDateString('es-AR', { weekday: 'long' })
    const id = await startWorkout(userId, `Entreno del ${name}`)
    navigate(`/entreno/${id}`)
  }

  /** Entreno suelto, sin rutina. Queda como acceso secundario. */
  const handleStartEmpty = async () => {
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

      {/* Actividad arriba de todo (Redisenio.md §3.3): lo primero que se
          quiere ver al abrir es cómo viene la semana. */}
      <StreakWeekCard />

      {/* Solo aparece si el usuario activó el contador desde Ajustes — no
          se le agrega peso visual a Home a nadie que no lo pidió. */}
      <CalorieSummaryRow />

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
        <div className="space-y-2">
          <button
            onClick={handleStart}
            className="flex w-full flex-col items-center gap-0.5 rounded-2xl bg-accent py-5 font-bold text-bg active:bg-accent-dim"
          >
            <span className="flex items-center gap-2 text-lg">
              <Play size={22} fill="currentColor" /> Iniciar entrenamiento
            </span>
            {nextDay && (
              <span className="text-[13px] font-semibold opacity-70">
                {activeRoutine?.name} · {nextDay.name}
              </span>
            )}
          </button>
          {nextDay && (
            <button
              onClick={handleStartEmpty}
              className="w-full py-1 text-[13px] font-medium text-ink-3 active:text-ink-2"
            >
              o entrenar sin rutina
            </button>
          )}
        </div>
      )}

      {activeRoutine && !activeWorkout && (routineDays?.length ?? 0) > 0 && (
        <section>
          <SectionHeader
            title={activeRoutine.name}
            action={
              <span
                className="mb-1.5 h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: activeRoutine.color }}
                aria-hidden="true"
              />
            }
          />
          <Card>
            {routineDays!.map((day) => (
              <Row key={day.id}>
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate text-[15px]',
                    day.isRest === 1 && 'text-ink-3'
                  )}
                >
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
                    className="flex h-9 shrink-0 items-center gap-1.5 rounded-xs bg-accent px-3 text-[13px] font-bold text-bg active:bg-accent-dim"
                  >
                    <Play size={13} fill="currentColor" /> Entrenar
                  </button>
                )}
              </Row>
            ))}
          </Card>
        </section>
      )}

      {/* La frase va al final: es un cierre, no puede empujar hacia abajo la
          acción principal de la pantalla. */}
      <blockquote className="px-1 text-[14px] leading-relaxed text-ink-3">
        {quote.text}
        {quote.author && <footer className="mt-1 text-[13px]">— {quote.author}</footer>}
      </blockquote>

    </div>
  )
}
