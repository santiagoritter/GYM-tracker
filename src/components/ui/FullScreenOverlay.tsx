import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import Portal from '@/components/ui/Portal'
import { useScrollLock } from '@/hooks/useScrollLock'
import { pushBackHandler } from '@/lib/backStack'
import { cn } from '@/lib/utils'

/**
 * Capa a pantalla completa (escáner de QR, visor de fotos, selector de ejercicios).
 *
 * Por qué existe: la app se dibuja DEBAJO de la barra de estado y de la Dynamic
 * Island (`ios.contentInset: 'never'` + `viewport-fit=cover`). Cada capa armada a
 * mano con `fixed inset-0` olvidaba el inset superior, y su botón de cerrar quedaba
 * bajo el notch, donde el toque no llega (reportado por testers con el escáner).
 * Acá el inset superior se aplica una sola vez; el inferior lo resuelve cada capa
 * en su pie (`pb-[calc(1rem+env(safe-area-inset-bottom))]`).
 *
 * También bloquea el scroll de fondo y registra el cierre con el botón atrás de
 * Android, igual que `ResponsiveSheet`.
 */
export default function FullScreenOverlay({
  onClose,
  children,
  className,
}: {
  onClose: () => void
  children: React.ReactNode
  className?: string
}) {
  useScrollLock()
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useEffect(() => pushBackHandler(() => onCloseRef.current()), [])

  return (
    <Portal>
      <div
        className={cn(
          'fixed inset-0 z-50 flex flex-col bg-bg pt-[env(safe-area-inset-top)]',
          className
        )}
      >
        {children}
      </div>
    </Portal>
  )
}

/** Botón de cerrar de 44×44 (DESIGN.md §5). */
export function OverlayCloseButton({
  onClick,
  label = 'Cerrar',
  className,
}: {
  onClick: () => void
  label?: string
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-fill text-ink-2 active:bg-fill-2',
        className
      )}
    >
      <X size={18} strokeWidth={1.8} />
    </button>
  )
}
