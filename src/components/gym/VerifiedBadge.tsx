import { BadgeCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Check de coach verificado. Amarillo (warning de la paleta), no el acento
 * — es una marca de estado, no una acción, y no debe competir con el acento
 * de la pantalla. Lo pone SOLO el admin (ver 0012_coach.sql).
 */
export default function VerifiedBadge({
  size = 16,
  className,
}: {
  size?: number
  className?: string
}) {
  return (
    <BadgeCheck
      size={size}
      className={cn('shrink-0 text-warning', className)}
      aria-label="Coach verificado"
    />
  )
}
