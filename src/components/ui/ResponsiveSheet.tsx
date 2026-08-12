import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import Portal from '@/components/ui/Portal'
import { useSheetDrag } from '@/hooks/useSheetDrag'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import {
  sheetPanelVariantsFlex,
  sheetPanelVariantsFlexReduced,
  modalPanelVariants,
  modalPanelVariantsReduced,
} from '@/lib/motionVariants'

interface ResponsiveSheetProps {
  onClose: () => void
  children: ReactNode
  /** `panelDragProps` de useSheetDrag — se ignora en desktop, ahí no hay
   * gesto de arrastre que soportar (ver Layout.tsx vs LayoutDesktop.tsx
   * para el mismo criterio en la navegación). */
  dragProps?: ReturnType<typeof useSheetDrag>['panelDragProps']
  /** Clases propias del sheet (max-h, flex-col, overflow…), tal cual las
   * tenía antes de migrar a este wrapper — ResponsiveSheet solo decide la
   * posición y forma del panel (abajo vs centrado), no su contenido. */
  panelClassName?: string
  /** Este sheet se abre arriba de otro sheet ya abierto (ej.
   * AddToRoutineSheet sobre ExerciseDetailSheet): sin blur ni su animación
   * acá — apilar un segundo `backdrop-filter` sobre el que ya puso el
   * sheet de abajo agota las capas de composición en Android de gama
   * media (crash de pantalla negra ya reportado y resuelto una vez). */
  nested?: boolean
}

/**
 * Sheet que se presenta como hoja deslizable desde abajo en mobile y como
 * modal centrado en desktop (≥1024px) — mismo contenido, misma lógica de
 * apertura/cierre en el caller, solo cambia el chrome. Reemplaza el
 * boilerplate repetido de Portal + overlay + motion.div que tenían los 11
 * sheets de la app (ver DESIGN.md §3 y el plan de la versión PC).
 */
export default function ResponsiveSheet({
  onClose,
  children,
  dragProps,
  panelClassName,
  nested,
}: ResponsiveSheetProps) {
  const isDesktop = useIsDesktop()
  const reduced = useReducedMotion()

  const variants = isDesktop
    ? reduced
      ? modalPanelVariantsReduced
      : modalPanelVariants
    : reduced
      ? sheetPanelVariantsFlexReduced
      : sheetPanelVariantsFlex

  return (
    <Portal>
      <div
        className={cn(
          'fixed inset-0 z-50 flex justify-center',
          nested ? 'bg-black/70' : 'bg-bg/80 backdrop-blur-sm animate-glass-in',
          isDesktop ? 'items-center p-4' : 'items-end'
        )}
        onClick={onClose}
      >
        <motion.div
          initial="hidden"
          animate="visible"
          variants={variants}
          {...(isDesktop ? {} : dragProps)}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'w-full max-w-lg bg-surface shadow-float',
            isDesktop ? 'rounded-2xl' : 'rounded-t-3xl',
            panelClassName
          )}
        >
          {children}
        </motion.div>
      </div>
    </Portal>
  )
}
