/**
 * 7 anillos concéntricos, uno por día de la semana (lunes = más interno,
 * domingo = más externo) — inspirado en la estructura del ring-chart de
 * bklit.com y en los Activity Rings de Apple, pero con un solo acento (no
 * un color por anillo: DESIGN.md pide un único acento por pantalla) y sin
 * el glow de hover del original (es el anti-patrón de halo que DESIGN.md
 * prohíbe).
 *
 * Cada anillo es binario: entrenado (arco completo en acento) o no (solo
 * el track neutro). La transición de `strokeDashoffset` reacciona sola
 * cuando `trainedDays` pasa de vacío (carga) a los datos reales — no hace
 * falta disparar la animación a mano.
 */
export default function WeeklyActivityRings({
  trainedDays,
  size = 136,
  strokeWidth = 6,
  gap = 3,
  children,
}: {
  /** 7 booleanos, lunes a domingo. */
  trainedDays: boolean[]
  size?: number
  strokeWidth?: number
  gap?: number
  children?: React.ReactNode
}) {
  const step = strokeWidth + gap
  const outerR = size / 2 - strokeWidth / 2
  const cx = size / 2

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {trainedDays.map((done, i) => {
          const r = outerR - (trainedDays.length - 1 - i) * step
          const circ = 2 * Math.PI * r
          return (
            <g key={i}>
              <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgb(var(--color-surface-3))" strokeWidth={strokeWidth} />
              <circle
                cx={cx}
                cy={cx}
                r={r}
                fill="none"
                stroke="rgb(var(--color-accent))"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={done ? 0 : circ}
                style={{ transition: `stroke-dashoffset 500ms cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 60}ms` }}
              />
            </g>
          )
        })}
      </svg>
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
      )}
    </div>
  )
}
