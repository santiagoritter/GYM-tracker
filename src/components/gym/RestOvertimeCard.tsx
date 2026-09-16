import ResponsiveSheet from '@/components/ui/ResponsiveSheet'
import { useCountUp } from '@/hooks/useCountUp'

/**
 * Card que reemplaza el auto-cierre del descanso al llegar a 0. Antes
 * RestTimer.tsx se cerraba solo (`skipRest()`) apenas terminaba el tiempo
 * fijado — sin registrar cuánto se descansó REALMENTE, que es lo que hace
 * falta para sugerir un tiempo de descanso mejor (Bloque 6, TimeCounter).
 *
 * Dos caminos, ambos cierran la card y el descanso:
 *  - "Terminar descanso": el sobretiempo mostrado CUENTA para las métricas.
 *  - "Descartar sobretiempo": para cuando el usuario no tocó la app a
 *    tiempo y el contador se dejó correr de más sin querer — se guarda
 *    igual (para el historial), pero como `actualSeconds = plannedSeconds`
 *    y `discarded: 1`, no entra en la mediana de descanso real.
 *
 * Tocar el fondo (`onClose` de ResponsiveSheet) se trata igual que
 * "Descartar" — no hay forma de cerrar esto sin que quede una resolución
 * explícita, porque de eso depende que TimeCounter tenga datos limpios.
 */
export default function RestOvertimeCard({
  exerciseName,
  since,
  onFinish,
  onDiscard,
}: {
  exerciseName?: string
  since: number
  onFinish: () => void
  onDiscard: () => void
}) {
  const overtimeSec = useCountUp(since)
  const min = Math.floor(overtimeSec / 60)
  const sec = overtimeSec % 60

  return (
    <ResponsiveSheet
      onClose={onDiscard}
      panelClassName="px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-7"
    >
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-sm font-semibold text-ink-3">Descanso terminado</p>
        {exerciseName && <p className="text-lg font-bold">{exerciseName}</p>}
        <p className="mt-3 text-xs font-medium text-ink-3">Sobretiempo</p>
        <span className="font-mono text-[44px] font-bold leading-none tabular-nums text-warning">
          {min}:{String(sec).padStart(2, '0')}
        </span>
      </div>

      <div className="mt-7 flex flex-col gap-2">
        <button
          onClick={onFinish}
          className="h-12 w-full rounded-sm bg-accent text-sm font-bold text-bg active:bg-accent-dim"
        >
          Terminar descanso
        </button>
        <button
          onClick={onDiscard}
          className="h-11 w-full text-sm font-medium text-ink-3 active:text-ink-2"
        >
          Descartar sobretiempo
        </button>
      </div>
    </ResponsiveSheet>
  )
}
