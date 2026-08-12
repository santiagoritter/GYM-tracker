import { useDragControls, type PanInfo } from 'motion/react'

const DISMISS_OFFSET_PX = 120
const DISMISS_VELOCITY = 600

/**
 * Arrastrar-para-cerrar en los sheets "Smooth Drawer" (Fase 28) — solo
 * desde el handle de arriba (grip + header), no desde cualquier punto
 * del panel. Si el panel entero escuchara el drag, un swipe dentro de
 * una lista larga o el buscador se confundiría con un intento de
 * cerrar la hoja. `dragListener={false}` en el panel + `dragControls
 * .start()` en el handle es el patrón de Framer Motion para eso.
 */
export function useSheetDrag(onClose: () => void) {
  const dragControls = useDragControls()

  return {
    panelDragProps: {
      drag: 'y' as const,
      dragControls,
      dragListener: false,
      dragConstraints: { top: 0, bottom: 0 },
      dragElastic: { top: 0, bottom: 0.6 },
      onDragEnd: (_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
        if (info.offset.y > DISMISS_OFFSET_PX || info.velocity.y > DISMISS_VELOCITY) {
          onClose()
        }
      },
    },
    handleDragProps: {
      onPointerDown: (e: React.PointerEvent) => dragControls.start(e),
      style: { touchAction: 'none' as const },
    },
  }
}
