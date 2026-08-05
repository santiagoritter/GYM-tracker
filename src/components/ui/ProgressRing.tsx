import { cn } from '@/lib/utils'

/**
 * Anillo de progreso SVG animado. `progress` va de 0 a 1.
 *
 * Segunda versión (la primera se borró en la Fase 9 al quedar sin uso,
 * reemplazada por un widget de 7 anillos concéntricos que dos rondas de
 * feedback real marcaron como confuso — "se ve como un blanco de tiro").
 * Esta vuelve a un anillo único, pero theme-aware desde el arranque (la
 * original hardcodeaba el color y hubo que corregirla aparte en la Fase 10).
 */
export default function ProgressRing({
  progress,
  size = 72,
  stroke = 7,
  className,
  children,
}: {
  progress: number
  size?: number
  stroke?: number
  className?: string
  children?: React.ReactNode
}) {
  const clamped = Math.max(0, Math.min(1, progress))
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - clamped)

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--color-surface-3))" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgb(var(--color-accent))"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
      )}
    </div>
  )
}
