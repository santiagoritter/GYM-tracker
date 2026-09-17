import { useEffect, useRef } from 'react'
import { FastForward, Plus } from 'lucide-react'
import { useWorkoutStore } from '@/stores/workoutStore'
import { useCountdown } from '@/hooks/useCountdown'
import { cancelScheduledNotifications, hapticSuccess, isNative, notify } from '@/lib/native'
import { endRestActivity, finishRestActivity, startRestActivity } from '@/lib/liveActivity'
import { REST_END_MESSAGES, getRandomMessage } from '@/lib/motivational'
import RestOvertimeCard from '@/components/gym/RestOvertimeCard'

// Si el usuario no confirma la card de sobretiempo (RestOvertimeCard) en
// este tiempo, se resuelve sola como "descartar" — para no dejar el
// entreno bloqueado indefinidamente si se dejó el teléfono de lado. Mucho
// más laxo que el auto-dismiss de 12s que ya tiene la Live Activity para
// su propia UI nativa (eso no se toca, es independiente de esto).
const OVERTIME_AUTO_DISCARD_MS = 10 * 60 * 1000

export function RestTimer() {
  // Selectores, no destructurar el store entero (CLAUDE.md): sin esto,
  // completar/editar cualquier serie del entreno (addSet, updateSet…)
  // re-renderiza este componente aunque no toque restTimer para nada —
  // justo el momento en que RestTimer no debería tener trabajo extra.
  const restTimer = useWorkoutStore((s) => s.restTimer)
  const extendRest = useWorkoutStore((s) => s.extendRest)
  const resolveRestOvertime = useWorkoutStore((s) => s.resolveRestOvertime)
  const endsAt = restTimer.endsAt
  const totalSeconds = restTimer.totalSeconds
  const remaining = useCountdown(endsAt)
  // Evita que un re-render dispare dos veces el aviso de fin
  const firedFor = useRef<number | null>(null)

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

  /**
   * Live Activity del descanso (pantalla de bloqueo + Dynamic Island en
   * iOS). `startRestActivity` la crea o, si ya existe, la actualiza — así
   * "+30s" no la reinicia. Se cierra al saltar (endsAt → null). Al llegar a
   * 0, el efecto de abajo llama a `finishRestActivity` primero, que la deja
   * unos segundos mostrando solo el próximo ejercicio; el `endRestActivity`
   * que dispara este efecto queda como no-op durante esa ventana.
   * El unmount (salir del entreno) también la cierra.
   */
  const exerciseName = restTimer.exerciseName
  useEffect(() => {
    if (endsAt) startRestActivity(endsAt, totalSeconds, exerciseName)
    else endRestActivity()
  }, [endsAt, totalSeconds, exerciseName])

  useEffect(() => () => void endRestActivity(), [])

  // Efectos secundarios de llegar a 0 (haptic, notificación web, Live
  // Activity) separados del propio conteo — useCountdown es puro display.
  // Ya NO llama a skipRest() acá: antes el descanso se cerraba solo al
  // llegar a 0, sin registrar cuánto se descansó REALMENTE — ahora queda
  // esperando que el usuario confirme desde RestOvertimeCard (abajo), que
  // es quien llama a resolveRestOvertime() → skipRest().
  useEffect(() => {
    if (!endsAt || remaining !== 0 || firedFor.current === endsAt) return
    firedFor.current = endsAt
    hapticSuccess()
    // Solo en web: en nativo esto duplicaba el aviso. El efecto de arriba
    // ([endsAt]) YA agendó una notificación con el SO para este mismo
    // momento — si la app estaba en segundo plano, el SO ya la entregó; si
    // estaba abierta, el conteo puede haberse pausado (WKWebView frena los
    // timers en background) y este efecto recién dispara al volver a
    // primer plano, mucho después de la hora agendada. Bug real reportado:
    // sonaba al terminar Y otra vez (con háptico) al reabrir la app. En web
    // no existe notificación agendada — ahí sí hace falta disparar acá.
    if (!isNative) {
      notify('Descanso terminado', getRandomMessage(REST_END_MESSAGES).text)
    }
    // iOS: la Live Activity pasa a mostrar solo el próximo ejercicio.
    finishRestActivity(exerciseName)
  }, [remaining, endsAt, exerciseName])

  // Red de seguridad: si nadie confirma la card, se resuelve sola como
  // "descartar" a los 10 min — mismo criterio que restEndTask en
  // LiveActivityPlugin.swift, del lado JS.
  useEffect(() => {
    if (!endsAt || remaining !== 0) return
    const timer = window.setTimeout(() => resolveRestOvertime(true), OVERTIME_AUTO_DISCARD_MS)
    return () => window.clearTimeout(timer)
  }, [endsAt, remaining, resolveRestOvertime])

  if (!endsAt) return null

  if (remaining === 0) {
    return (
      <RestOvertimeCard
        exerciseName={exerciseName}
        since={endsAt}
        onFinish={() => resolveRestOvertime(false)}
        onDiscard={() => resolveRestOvertime(true)}
      />
    )
  }

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
            onClick={() => resolveRestOvertime(false)}
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
