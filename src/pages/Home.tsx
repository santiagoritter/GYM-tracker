import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Activity, ChevronRight, Images, Play, Flame } from 'lucide-react'
import { routinesFor, routineDaysOf, workoutsFor } from '@/db/scoped'
import { nextRoutineDay, startWorkoutFromDay } from '@/db/routines'
import { useWorkoutStore } from '@/stores/workoutStore'
import { useAuthStore } from '@/stores/authStore'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { HOME_MESSAGES } from '@/lib/motivational'
import { useElapsedDuration } from '@/hooks/useElapsedDuration'
import CalendarHeatmap from '@/components/gym/CalendarHeatmap'
import SpotifyNowPlaying from '@/components/gym/SpotifyNowPlaying'
import RoutineDaysSheet from '@/components/gym/RoutineDaysSheet'
import HoldButton from '@/components/ui/HoldButton'

export default function Home() {
  const navigate = useNavigate()
  const startWorkout = useWorkoutStore((s) => s.startWorkout)
  const { name } = useAuthStore()
  const userId = useCurrentUserId()
  const quote = useMemo(() => HOME_MESSAGES[Math.floor(Math.random() * HOME_MESSAGES.length)], [])
  const [daysSheetOpen, setDaysSheetOpen] = useState(false)

  const activeWorkout = useLiveQuery(
    () => (userId ? workoutsFor(userId).filter((w) => !w.finishedAt).first() : undefined),
    [userId]
  )
  const activeElapsed = useElapsedDuration(activeWorkout?.startedAt)
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

  const handleStartDay = async (dayId: string) => {
    if (!userId) return
    const id = await startWorkoutFromDay(userId, dayId)
    navigate(`/entreno/${id}`)
  }

  return (
    <div className="mx-auto content-width space-y-6">
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

      {/* El resumen de calorías vive en el header (CalorieHeaderBadge,
          junto al avatar) — visible desde cualquier pantalla, no solo acá. */}
      <SpotifyNowPlaying />

      {/* El header global (Layout.tsx) ya muestra un indicador chico del
          entreno en curso, visible desde cualquier pantalla — este botón
          grande es el CTA principal de Inicio específicamente. */}
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
            <p className="text-sm text-ink-2">{activeElapsed}</p>
          </div>
          <ChevronRight className="text-accent" />
        </button>
      ) : (
        <div className="space-y-2">
          <HoldButton
            onComplete={handleStart}
            holdDuration={500}
            className="card-shine flex w-full flex-col items-center gap-0.5 rounded-2xl bg-accent py-5 font-bold text-bg active:bg-accent-dim"
          >
            <span className="flex items-center gap-2 text-lg">
              <Play size={22} fill="currentColor" /> Iniciar entrenamiento
            </span>
            {nextDay && (
              <span className="text-[13px] font-semibold opacity-70">
                {activeRoutine?.name} · {nextDay.name}
              </span>
            )}
          </HoldButton>
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

      {/* Actividad (Redisenio.md §3.3): debajo del CTA principal, no
          compite con "qué entreno hoy" por la primera mirada. */}
      <CalendarHeatmap />

      {activeRoutine && !activeWorkout && (routineDays?.length ?? 0) > 0 && (
        <button
          onClick={() => setDaysSheetOpen(true)}
          className="flex w-full items-center justify-between rounded-2xl bg-surface p-4 text-left"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: activeRoutine.color }}
              aria-hidden="true"
            />
            <span className="truncate font-semibold">{activeRoutine.name}</span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-ink-3" />
        </button>
      )}

      {daysSheetOpen && activeRoutine && (
        <RoutineDaysSheet
          routine={activeRoutine}
          days={routineDays ?? []}
          onStartDay={handleStartDay}
          onClose={() => setDaysSheetOpen(false)}
        />
      )}

      {/* La frase va al final: es un cierre, no puede empujar hacia abajo la
          acción principal de la pantalla. */}
      <blockquote className="px-1 text-[14px] leading-relaxed text-ink-3">
        {quote.text}
        {quote.author && <footer className="mt-1 text-[13px]">— {quote.author}</footer>}
      </blockquote>

      {/* Accesos rápidos, mitad y mitad — cuadrados del mismo tamaño. */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/progreso?tab=photos')}
          className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl bg-surface"
        >
          <Images size={28} className="text-ink-2" />
          <span className="text-[13px] font-semibold text-ink-2">Tus fotos</span>
        </button>
        <button
          onClick={() => navigate('/cardio')}
          className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl bg-surface"
        >
          <Activity size={28} className="text-accent" />
          <span className="text-[13px] font-semibold text-ink-2">Modo cardio</span>
        </button>
      </div>
    </div>
  )
}
