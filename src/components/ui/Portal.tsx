import { createPortal } from 'react-dom'

/**
 * Renderiza sus hijos directo en document.body, saltando el árbol de
 * componentes actual. Necesario para overlays `position: fixed` (sheets,
 * modales): si un ancestro tiene `transform` aplicado (ej. las animaciones
 * de entrada de página en Layout.tsx), ese ancestro se convierte en el
 * "contenedor" del elemento fixed en vez de la ventana — el overlay queda
 * mal posicionado, a veces completamente fuera de la pantalla visible.
 */
export default function Portal({ children }: { children: React.ReactNode }) {
  return createPortal(children, document.body)
}
