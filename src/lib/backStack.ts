/**
 * Pila de "qué cerrar con el botón atrás de Android" — antes ese botón no
 * hacía nada útil: `App.java` del lado nativo solo intenta volver atrás en
 * el WebView (no hay historial real de página a página en una SPA) y, si
 * no puede, se queda sin hacer nada (ni cierra un sheet abierto, ni sale de
 * la app). `ResponsiveSheet` empuja acá su `onClose` al montarse y lo saca
 * al desmontarse — cualquier sheet/modal queda cubierto sin tocar sus ~30
 * call sites uno por uno. Sin dependencias de React: es una pila a nivel
 * de módulo, para que el listener nativo (que vive fuera del árbol de
 * componentes) pueda consultarla.
 */
type CloseHandler = () => void

const stack: CloseHandler[] = []

/** Se llama al abrir un overlay (sheet, modal, dialog). Devuelve la función
 * de limpieza — llamarla al cerrarlo/desmontarlo. */
export function pushBackHandler(onClose: CloseHandler): () => void {
  stack.push(onClose)
  return () => {
    const i = stack.lastIndexOf(onClose)
    if (i !== -1) stack.splice(i, 1)
  }
}

/** Intenta cerrar el overlay más reciente. `true` si había uno (el back se
 * "consumió" acá, no tiene que navegar ni minimizar la app).
 *
 * Saca la entrada de la pila ACÁ, no espera a que el `useEffect` de
 * cleanup del componente la saque solo: ese cleanup corre recién en el
 * próximo render (después de que `onClose()` dispare un `setState`), así
 * que entre medio la pila seguía teniendo una entrada "vieja" — un
 * segundo toque rápido del botón atrás, antes de ese re-render, volvía a
 * llamar el mismo handler dos veces. Con el pop acá, la pila queda
 * consistente ya mismo; el pop que devuelve `pushBackHandler` (llamado
 * desde el cleanup real) es idempotente si la entrada ya no está.*/
export function consumeBack(): boolean {
  const top = stack.pop()
  if (!top) return false
  top()
  return true
}

/** Para tests / casos de borde: ¿hay algo abierto ahora mismo? */
export function hasOpenOverlay(): boolean {
  return stack.length > 0
}
