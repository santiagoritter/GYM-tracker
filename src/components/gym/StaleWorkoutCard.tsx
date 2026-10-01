import { useState } from 'react'
import { Clock } from 'lucide-react'
import { useWorkoutStore } from '@/stores/workoutStore'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { inactiveLabel } from '@/lib/staleWorkout'
import { toast } from '@/stores/toastStore'
import type { Workout } from '@/types'

/**
 * Reemplaza al "Entreno en curso" cuando el entreno quedó abandonado (ver
 * lib/staleWorkout.ts): en vez de seguir contando horas, pregunta.
 * "Terminar" lo cierra con la hora de su última actividad, no con la de
 * ahora — la duración guardada es la que de verdad entrenó.
 */
export default function StaleWorkoutCard({
  workout,
  lastActivity,
  onKeep,
  onResolved,
}: {
  workout: Workout
  lastActivity: string
  onKeep: () => void
  onResolved?: () => void
}) {
  const userId = useCurrentUserId()
  const finishWorkout = useWorkoutStore((s) => s.finishWorkout)
  const discardWorkout = useWorkoutStore((s) => s.discardWorkout)
  const [busy, setBusy] = useState(false)

  const run = async (action: () => Promise<unknown>, done: string) => {
    if (busy) return
    setBusy(true)
    try {
      await action()
      toast.success(done)
      onResolved?.()
    } catch (e) {
      toast.error('No se pudo guardar', e instanceof Error ? e.message : 'Probá de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  const finish = () => {
    if (!userId) return
    void run(() => finishWorkout(userId, workout.id, undefined, lastActivity), 'Entreno guardado')
  }

  const discard = () => {
    if (!confirm(`¿Descartar "${workout.name}"? Se borran todas sus series.`)) return
    void run(() => discardWorkout(workout.id), 'Entreno descartado')
  }

  return (
    <div className="rounded-md bg-surface p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-warning">
        <Clock size={16} /> Entreno sin terminar
      </p>
      <p className="mt-1 font-medium">{workout.name}</p>
      <p className="text-sm text-ink-2">Sin actividad desde {inactiveLabel(lastActivity)}. ¿Qué hacemos?</p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <button
          onClick={finish}
          disabled={busy}
          className="h-11 rounded-sm bg-accent text-[14px] font-bold text-bg active:bg-accent-dim disabled:opacity-50"
        >
          Terminar
        </button>
        <button
          onClick={onKeep}
          disabled={busy}
          className="h-11 rounded-sm bg-fill text-[14px] font-semibold text-ink active:bg-fill-2 disabled:opacity-50"
        >
          Seguir
        </button>
        <button
          onClick={discard}
          disabled={busy}
          className="h-11 rounded-sm text-[14px] font-semibold text-danger active:bg-danger/10 disabled:opacity-50"
        >
          Descartar
        </button>
      </div>
    </div>
  )
}
