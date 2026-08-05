import { useEffect, useState } from 'react'

/**
 * Alto del teclado virtual en píxeles (0 si está cerrado o el navegador no
 * soporta `visualViewport`). `position: fixed` sigue pegado al *layout*
 * viewport, que no se achica cuando el teclado abre — sin esto, el fondo
 * de un sheet fijo queda tapado por el teclado en vez de subir. Solo
 * `visualViewport` refleja el espacio realmente visible.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    const update = () => {
      setInset(Math.max(0, Math.round(window.innerHeight - vv.height)))
    }
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  return inset
}
