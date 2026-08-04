import { useCallback, useEffect, useRef, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

const HOLD_DELAY_MS = 450 // antes de esto es un tap normal
const HOLD_RAMP_MS = [280, 160, 90, 55] // acelera mientras se mantiene
const COMMIT_DEBOUNCE_MS = 600

interface Props {
  value: number
  step: number
  min: number
  max?: number
  /** 0 para repeticiones, 1 para kilos. */
  decimals?: number
  onChange: (value: number) => void
  label?: string
  disabled?: boolean
}

/**
 * Stepper numérico pensado para usarse con una sola mano, sudado y apurado
 * entre series. Corrige los problemas concretos del anterior:
 *
 *  - Targets de 44px (el mínimo de las HIG de Apple). Los de 32px de antes
 *    quedaban por debajo y había seis por fila.
 *  - Mantener apretado repite y acelera: llegar de 0 a 60 kg eran 24 taps,
 *    cada uno con su escritura a IndexedDB.
 *  - El input tiene borrador local. El anterior estaba atado directo al valor
 *    de la base con `Number(e.target.value) || 0`, así que borrar el campo
 *    para reescribirlo guardaba 0, y tipear "10" guardaba 1 y después 10.
 *  - `inputMode="decimal"` y select-all al enfocar, para no pelear con el
 *    teclado ni tener que borrar dígito por dígito.
 */
export default function NumberStepper({
  value,
  step,
  min,
  max,
  decimals = 1,
  onChange,
  label,
  disabled,
}: Props) {
  const [draft, setDraft] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const holdTimers = useRef<number[]>([])
  const commitTimer = useRef<number | undefined>(undefined)

  const clamp = useCallback(
    (v: number) => {
      const bounded = Math.min(max ?? Infinity, Math.max(min, v))
      const factor = 10 ** decimals
      return Math.round(bounded * factor) / factor
    },
    [min, max, decimals]
  )

  const format = (v: number) => (decimals === 0 ? String(v) : String(v))

  const clearHold = useCallback(() => {
    holdTimers.current.forEach((t) => window.clearTimeout(t))
    holdTimers.current = []
  }, [])

  useEffect(() => () => {
    clearHold()
    window.clearTimeout(commitTimer.current)
  }, [clearHold])

  const bump = useCallback(
    (direction: 1 | -1) => {
      // Si hay algo a medio tipear, se consolida antes de sumar/restar para
      // no perder lo escrito.
      const base = draft !== null && draft !== '' ? Number(draft) : value
      const next = clamp((Number.isFinite(base) ? base : value) + direction * step)
      setDraft(null)
      onChange(next)
    },
    [draft, value, step, clamp, onChange]
  )

  /** Mantener apretado: un paso al tocar, después repetición acelerada. */
  const startHold = (direction: 1 | -1) => {
    if (disabled) return
    bump(direction)
    let elapsed = HOLD_DELAY_MS
    HOLD_RAMP_MS.forEach((interval, rampIndex) => {
      // Cada tramo de la rampa dispara varias veces antes de acelerar más
      const repeats = rampIndex === HOLD_RAMP_MS.length - 1 ? 40 : 5
      for (let i = 0; i < repeats; i++) {
        elapsed += interval
        holdTimers.current.push(
          window.setTimeout(() => bump(direction), elapsed)
        )
      }
    })
  }

  const commitDraft = (raw: string) => {
    window.clearTimeout(commitTimer.current)
    setDraft(null)
    if (raw.trim() === '') return // campo vacío: se descarta, no se guarda 0
    const parsed = Number(raw.replace(',', '.'))
    if (!Number.isFinite(parsed)) return
    onChange(clamp(parsed))
  }

  return (
    <div className="flex items-center justify-center gap-1">
      <button
        type="button"
        onPointerDown={() => startHold(-1)}
        onPointerUp={clearHold}
        onPointerLeave={clearHold}
        onPointerCancel={clearHold}
        onContextMenu={(e) => e.preventDefault()}
        disabled={disabled || value <= min}
        aria-label={label ? `Bajar ${label}` : 'Bajar'}
        className="flex h-11 w-11 shrink-0 touch-none select-none items-center justify-center rounded-xl bg-surface-2 text-ink-2 transition-colors active:bg-surface-3 disabled:opacity-30"
      >
        <Minus size={18} strokeWidth={2.5} />
      </button>

      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        enterKeyHint="done"
        disabled={disabled}
        value={draft ?? format(value)}
        aria-label={label}
        onChange={(e) => {
          const raw = e.target.value
          if (!/^[0-9]*[.,]?[0-9]*$/.test(raw)) return
          setDraft(raw)
          // Red de seguridad por si el blur nunca llega (teclado de iOS que
          // se cierra con "Listo", navegación inesperada, etc.)
          window.clearTimeout(commitTimer.current)
          commitTimer.current = window.setTimeout(
            () => commitDraft(raw),
            COMMIT_DEBOUNCE_MS
          )
        }}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={(e) => commitDraft(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') inputRef.current?.blur()
        }}
        className="h-11 w-full min-w-0 rounded-xl bg-surface-2 text-center font-mono text-base font-bold outline-none transition-shadow focus:ring-2 focus:ring-accent disabled:opacity-40"
      />

      <button
        type="button"
        onPointerDown={() => startHold(1)}
        onPointerUp={clearHold}
        onPointerLeave={clearHold}
        onPointerCancel={clearHold}
        onContextMenu={(e) => e.preventDefault()}
        disabled={disabled || (max !== undefined && value >= max)}
        aria-label={label ? `Subir ${label}` : 'Subir'}
        className={cn(
          'flex h-11 w-11 shrink-0 touch-none select-none items-center justify-center rounded-xl bg-surface-2 text-ink-2 transition-colors active:bg-surface-3 disabled:opacity-30'
        )}
      >
        <Plus size={18} strokeWidth={2.5} />
      </button>
    </div>
  )
}
