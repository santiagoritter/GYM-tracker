import { useEffect, useState } from 'react'

/** Segundos restantes hasta `endsAt` (epoch ms), tickeando en vivo. Puro
 * display — sin efectos secundarios (haptics, notificaciones, auto-skip):
 * eso sigue siendo responsabilidad de RestTimer.tsx, que es lo único que
 * está montado mientras el usuario efectivamente entrena. Este hook lo
 * usan lecturas de solo lectura en otras pantallas (ver el badge del
 * header en AppHeader.tsx).
 *
 * El valor se calcula EN EL RENDER (no en un `useState` actualizado por
 * efecto): guardarlo en estado dejaba una ventana de un render, justo
 * después de que `endsAt` cambia, donde el hook todavía devolvía el
 * `remaining` viejo (0, de la última vez que `endsAt` era `null`) porque
 * el efecto que lo recalculaba todavía no había corrido. RestTimer.tsx
 * usa ese valor para detectar "llegó a cero" — con el valor viejo en 0,
 * disparaba `skipRest()` de inmediato al arrancar un descanso nuevo, antes
 * de que la barra llegara a pintarse. El `useEffect` de acá abajo solo
 * fuerza el re-render cada 250ms; el número en sí sale siempre fresco. */
export function useCountdown(endsAt: number | null): number {
  const [, forceTick] = useState(0)

  useEffect(() => {
    if (!endsAt) return
    const interval = setInterval(() => forceTick((n) => n + 1), 250)
    return () => clearInterval(interval)
  }, [endsAt])

  if (!endsAt) return 0
  return Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
}
