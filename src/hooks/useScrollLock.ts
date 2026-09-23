import { useEffect } from 'react'

let lockCount = 0

/**
 * Bloquea el scroll del documento mientras el componente que lo llama
 * esté montado (o mientras `locked` sea true). Bloquea
 * `document.documentElement`, no `body`: desde el fix del scroll roto en
 * Android/PWA/PC (ver el comentario de index.css) el que scrollea de
 * verdad es `html`, no `body` — bloquear `body` ahí no frena nada.
 *
 * Contador de referencias a nivel de módulo: dos sheets anidados (ej.
 * `AddToRoutineSheet` sobre `ExerciseDetailSheet`, ambos vía
 * `ResponsiveSheet`) pueden bloquear a la vez sin pisarse — el scroll
 * vuelve recién cuando se desmonta el último.
 */
export function useScrollLock(locked = true) {
  useEffect(() => {
    if (!locked) return
    lockCount += 1
    if (lockCount === 1) {
      document.documentElement.style.overflow = 'hidden'
    }
    return () => {
      lockCount -= 1
      if (lockCount === 0) {
        document.documentElement.style.overflow = ''
      }
    }
  }, [locked])
}
