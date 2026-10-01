import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Bike, ChevronRight, Play, Flame, Route, Settings } from 'lucide-react'
import { routinesFor, routineDaysOf, workoutsFor } from '@/db/scoped'
import { nextRoutineDay, startWorkoutFromDay } from '@/db/routines'
import { useWorkoutStore } from '@/stores/workoutStore'
import { useAuthStore } from '@/stores/authStore'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { getQuoteForNow } from '@/lib/quotes'
import { activeWorkoutRoute } from '@/lib/cardio'
import { useElapsedDuration } from '@/hooks/useElapsedDuration'
import { useStaleWorkout } from '@/hooks/useStaleWorkout'
import StaleWorkoutCard from '@/components/gym/StaleWorkoutCard'
import NewsCard from '@/components/gym/NewsCard'
import CalendarHeatmap from '@/components/gym/CalendarHeatmap'
import SpotifyNowPlaying from '@/components/gym/SpotifyNowPlaying'
import RoutineDaysSheet from '@/components/gym/RoutineDaysSheet'
import CardioSetupSheet from '@/components/gym/CardioSetupSheet'
import HoldButton from '@/components/ui/HoldButton'
import { Card, Row } from '@/components/ui/Card'

export default function Home() {
  const navigate = useNavigate()
  const startWorkout = useWorkoutStore((s) => s.startWorkout)
  const name = useAuthStore((s) => s.name)
  const userId = useCurrentUserId()
  // Frase del momento del día (estoicos/filosofía, no genérica de gym).
  // Estable dentro del día — ver getQuoteForNow. Se recalcula por render sin
  // efecto; useMemo solo para no rebuscar la lista en cada re-render.
  const quote = useMemo(() => getQuoteForNow(), [])
  const [daysSheetOpen, setDaysSheetOpen] = useState(false)
  const [cardioSheetOpen, setCardioSheetOpen] = useState(false)

  const activeWorkout = useLiveQuery(
    () => (userId ? workoutsFor(userId).filter((w) => !w.finishedAt).first() : undefined),
    [userId]
  )
  const activeElapsed = useElapsedDuration(activeWorkout?.startedAt)
  const staleWorkout = useStaleWorkout(activeWorkout)
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
      {activeWorkout && staleWorkout.stale && staleWorkout.lastActivity ? (
        <StaleWorkoutCard
          workout={activeWorkout}
          lastActivity={staleWorkout.lastActivity}
          onKeep={() => {
            staleWorkout.keep()
            navigate(activeWorkoutRoute(activeWorkout.id, activeWorkout.kind))
          }}
        />
      ) : activeWorkout ? (
        <button
          onClick={() => navigate(activeWorkoutRoute(activeWorkout.id, activeWorkout.kind))}
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
            className="flex h-[72px] w-full flex-col items-center justify-center gap-0.5 rounded-md bg-accent font-bold text-bg active:bg-accent-dim"
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

      <NewsCard />

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

      {/* Accesos rápidos — cuadrados del mismo tamaño. Si ya hay un entreno
          activo (de cualquier tipo), llevan a retomarlo en vez de crear uno
          nuevo — antes solo el CTA grande de arriba tenía esta protección;
          estos tiles podían crear un segundo Workout concurrente. */}
      {/* Accesos rápidos como una lista estilo Ajustes de iOS (DESIGN.md §3):
          antes eran tres tarjetas cuadradas con el ícono en un círculo de
          color — el "icon tile stack" de impeccable.style, reportado como
          feo por un tester. Ícono monocromo, descripción y chevron. */}
      <Card>
        <Row
          onClick={() =>
            activeWorkout
              ? navigate(activeWorkoutRoute(activeWorkout.id, activeWorkout.kind))
              : setCardioSheetOpen(true)
          }
        >
          <Bike size={20} strokeWidth={1.8} className="shrink-0 text-ink-2" />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-medium">Cardio</p>
            <p className="text-[13px] text-ink-3">Bici, elíptica, remo o cinta</p>
          </div>
          <ChevronRight size={18} className="shrink-0 text-ink-4" />
        </Row>
        <Row
          onClick={() =>
            navigate(activeWorkout ? activeWorkoutRoute(activeWorkout.id, activeWorkout.kind) : '/correr')
          }
        >
          <Route size={20} strokeWidth={1.8} className="shrink-0 text-ink-2" />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-medium">Correr</p>
            <p className="text-[13px] text-ink-3">Recorrido con GPS, ritmo y parciales</p>
          </div>
          <ChevronRight size={18} className="shrink-0 text-ink-4" />
        </Row>
        <Row onClick={() => navigate('/perfil')}>
          <Settings size={20} strokeWidth={1.8} className="shrink-0 text-ink-2" />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-medium">Ajustes</p>
            <p className="text-[13px] text-ink-3">Perfil, unidades, recordatorios y datos</p>
          </div>
          <ChevronRight size={18} className="shrink-0 text-ink-4" />
        </Row>
      </Card>

      {cardioSheetOpen && <CardioSetupSheet onClose={() => setCardioSheetOpen(false)} />}
    </div>
  )
}
