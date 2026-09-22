/**
 * El isotipo de Repe: el anillo de progreso, tal cual el SVG de marca
 * (repe-marca.svg) — mismas dos circunferencias, mismo gap y cap redondeado.
 * Usa `currentColor`, así que el color lo pone el className del caller (acá
 * adentro de la app siempre `text-accent`, el lima de la UI — el dorado de
 * marca queda reservado al ícono de la app y al splash, ver
 * scripts/generate-icons.mjs). Sin caja de color detrás: el anillo solo,
 * como lo muestra la guía de marca.
 */
export default function RepeMark({
  size = 40,
  className,
}: {
  size?: number
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-hidden="true"
    >
      <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="4" />
      <circle
        cx="50"
        cy="50"
        r="40"
        fill="none"
        stroke="currentColor"
        strokeWidth="16"
        strokeLinecap="round"
        strokeDasharray="175.8 75.4"
        transform="rotate(-90 50 50)"
      />
    </svg>
  )
}
