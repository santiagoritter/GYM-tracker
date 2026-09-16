import { useEffect, useState } from 'react'

/** Segundos transcurridos desde `since` (epoch ms), tickeando en vivo —
 * el inverso de `useCountdown`, mismo criterio: el valor se deriva EN EL
 * RENDER a partir de `Date.now()`, nunca se guarda en estado (ver el
 * comentario largo de `useCountdown.ts` sobre por qué). Lo usa la card de
 * sobretiempo de descanso (`RestOvertimeCard.tsx`) para mostrar cuánto
 * lleva corriendo desde que el descanso planeado terminó. */
export function useCountUp(since: number | null): number {
  const [, forceTick] = useState(0)

  useEffect(() => {
    if (!since) return
    const interval = setInterval(() => forceTick((n) => n + 1), 250)
    return () => clearInterval(interval)
  }, [since])

  if (!since) return 0
  return Math.max(0, Math.floor((Date.now() - since) / 1000))
}
