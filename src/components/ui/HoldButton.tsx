import { useEffect, useRef, useState } from 'react'
import { motion, useAnimation, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'

/**
 * Mantener presionado para confirmar — adaptado del Hold Button de
 * kokonutui.com. Dos ajustes deliberados sobre el original, no una copia
 * literal:
 * - Barra de progreso con `scaleX` (transform-origin a la izquierda) en
 *   vez de animar `width`: CLAUDE.md solo permite animar transform/opacity,
 *   `width` dispara layout en cada frame.
 * - `holdDuration` mucho más corto que el ejemplo (ahí eran 3000ms, pensado
 *   para confirmar un borrado — la fricción larga es la función). Acá lo
 *   define el caller; para la acción más frecuente de la app 3s sería
 *   fricción excesiva.
 */
export default function HoldButton({
  onComplete,
  holdDuration = 500,
  className,
  children,
  disabled,
}: {
  onComplete: () => void
  holdDuration?: number
  className?: string
  children: React.ReactNode
  disabled?: boolean
}) {
  const controls = useAnimation()
  const reduced = useReducedMotion()
  const [holding, setHolding] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const start = () => {
    if (disabled) return
    setHolding(true)
    if (!reduced) {
      controls.set({ scaleX: 0 })
      controls.start({ scaleX: 1, transition: { duration: holdDuration / 1000, ease: 'linear' } })
    }
    timerRef.current = setTimeout(onComplete, holdDuration)
  }

  const cancel = () => {
    setHolding(false)
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (!reduced) controls.start({ scaleX: 0, transition: { duration: 0.15 } })
  }

  return (
    <button
      disabled={disabled}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      aria-pressed={holding}
      className={cn('relative touch-none overflow-hidden', className)}
    >
      {!reduced && (
        <motion.div
          animate={controls}
          initial={{ scaleX: 0 }}
          style={{ originX: 0 }}
          className="absolute inset-0 bg-bg/20"
        />
      )}
      <span className="relative z-10">{children}</span>
    </button>
  )
}
