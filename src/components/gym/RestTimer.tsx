import { useEffect, useRef, useState } from 'react'
import { FastForward, Plus } from 'lucide-react'
import { useWorkoutStore } from '@/stores/workoutStore'
import { cancelScheduledNotifications, hapticSuccess, notify } from '@/lib/native'
import { REST_END_MESSAGES, getRandomMessage } from '@/lib/motivational'

export function RestTimer() {
  const { restTimer, skipRest, extendRest } = useWorkoutStore()
  const [remaining, setRemaining] = useState(0)
  // Evita que un re-render dispare dos veces el aviso de fin
  const firedFor = useRef<number | null>(null)

  const endsAt = restTimer.endsAt

  /**
   * Notificación programada con el sistema operativo.
   *
   * En nativo se agenda con el OS, así que llega con la pantalla apagada o
   * la app en segundo plano — que es exactamente cuando hace falta. En web
   * no se puede programar a futuro sin push, así que ahí el aviso lo dispara
   * el tick del temporizador (solo sirve con la app abierta).
   */
  useEffect(() => {
    if (!endsAt) {
      cancelScheduledNotifications()
      return
    }
    const seconds = Math.max(0, Math.round((endsAt - Date.now()) / 1000))
    const message = getRandomMessage(REST_END_MESSAGES)
    notify('Descanso terminado', message.text, seconds)
    return () => {
      cancelScheduledNotifications()
    }
  }, [endsAt])

  useEffect(() => {
    if (!endsAt) return
    const tick = () => {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
      setRemaining(left)
      if (left === 0 && firedFor.current !== endsAt) {
        firedFor.current = endsAt
        hapticSuccess()
        // En web, la notificación agendada no existe: se dispara acá.
        notify('Descanso terminado', getRandomMessage(REST_END_MESSAGES).text)
        skipRest()
      }
    }
    tick()
    const interval = setInterval(tick, 250)
    return () => clearInterval(interval)
  }, [endsAt, skipRest])

  if (!endsAt) return null

  const progress = restTimer.totalSeconds > 0 ? remaining / restTimer.totalSeconds : 0
  const min = Math.floor(remaining / 60)
  const sec = remaining % 60

  return (
    <div
      role="timer"
      aria-live="off"
      className="fixed bottom-0 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 border-t border-line-2 bg-surface px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-ink-3">
            Descanso
          </p>
          <span className="font-mono text-[38px] font-bold leading-none tabular-nums text-accent">
            {min}:{String(sec).padStart(2, '0')}
          </span>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => extendRest(30)}
            className="flex h-11 items-center gap-1 rounded-sm border border-line-2 px-3.5 text-sm font-medium text-ink-2 active:bg-surface-2"
          >
            <Plus size={16} /> 30s
          </button>
          <button
            onClick={skipRest}
            className="flex h-11 items-center gap-1.5 rounded-sm bg-accent px-4 text-sm font-semibold text-bg active:bg-accent-dim"
          >
            <FastForward size={16} /> Saltar
          </button>
        </div>
      </div>
      {/* Solo se anima transform: animar width provoca layout thrash */}
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface-3">
        <div
          className="h-full origin-left rounded-full bg-accent transition-transform duration-300 ease-standard"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
    </div>
  )
}
