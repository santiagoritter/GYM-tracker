import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Flame, Shield, Timer } from 'lucide-react'
import { workoutsFor } from '@/db/scoped'
import { useAuthStore } from '@/stores/authStore'
import { useWorkoutStore } from '@/stores/workoutStore'
import { useCardioStore } from '@/stores/cardioStore'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { useElapsedDuration } from '@/hooks/useElapsedDuration'
import { useCountdown } from '@/hooks/useCountdown'
import { activeWorkoutRoute } from '@/lib/cardio'
import CalorieHeaderBadge from '@/components/gym/CalorieHeaderBadge'

/**
 * Header sticky compartido por Layout (mobile) y LayoutDesktop — mismo
 * contenido en los dos: avatar, badge de entreno en curso, descanso
 * restante y calorías. Solo cambia el ancho del contenedor que lo envuelve
 * (columna angosta vs. contenedor ancho), nunca el header en sí.
 */
export default function AppHeader() {
  const navigate = useNavigate()
  const { name, role } = useAuthStore()
  const userId = useCurrentUserId()
  const activeWorkout = useLiveQuery(
    () => (userId ? workoutsFor(userId).filter((w) => !w.finishedAt).first() : undefined),
    [userId]
  )
  const elapsed = useElapsedDuration(activeWorkout?.startedAt)
  // Store global, no atado a esta pantalla: si hay un descanso corriendo
  // (arrancado desde el entreno activo) se ve acá aunque se haya
  // navegado a otra parte de la app — RestTimer.tsx sigue siendo el único
  // que dispara haptics/notificación/auto-skip, esto es solo lectura.
  const restEndsAt = useWorkoutStore((s) => s.restTimer.endsAt)
  const restRemaining = useCountdown(restEndsAt)
  const cardioWorkoutId = useCardioStore((s) => s.session?.workoutId)

  const initials = (name ?? 'U')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 pt-[env(safe-area-inset-top)] pb-0">
      <div className="glass absolute inset-0 -z-10 border-b border-line" />
      <button onClick={() => navigate('/perfil')} className="flex min-h-11 items-center gap-2.5 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-bg">
          {initials}
        </div>
        <span className="max-w-[140px] truncate text-[15px] font-semibold text-ink">
          {name?.split(' ')[0] ?? 'Campeón'}
        </span>
        {role === 'admin' && (
          <span className="rounded-xs bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-accent">
            Admin
          </span>
        )}
      </button>
      <div className="flex items-center gap-1.5">
        {activeWorkout && (
          <button
            onClick={() => navigate(activeWorkoutRoute(activeWorkout.id, cardioWorkoutId))}
            aria-label="Entreno en curso"
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-accent px-2.5 text-[12px] font-bold text-bg"
          >
            <Flame size={13} fill="currentColor" />
            <span className="font-mono tabular-nums">{elapsed}</span>
          </button>
        )}
        {activeWorkout && restEndsAt && (
          <button
            onClick={() => navigate(activeWorkoutRoute(activeWorkout.id, cardioWorkoutId))}
            aria-label="Descanso restante"
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-fill px-2.5 text-[12px] font-semibold text-ink-2"
          >
            <Timer size={13} className="text-ink-3" />
            <span className="font-mono tabular-nums">
              {Math.floor(restRemaining / 60)}:{String(restRemaining % 60).padStart(2, '0')}
            </span>
          </button>
        )}
        <CalorieHeaderBadge />
        {role === 'admin' && (
          <button
            onClick={() => navigate('/admin')}
            className="flex h-11 items-center rounded-sm px-3 text-xs font-medium text-ink-2 transition-colors active:bg-fill"
          >
            <Shield size={15} className="mr-1 inline" />Panel
          </button>
        )}
      </div>
    </header>
  )
}
