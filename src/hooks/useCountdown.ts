import { useEffect, useState } from 'react'

/** Segundos restantes hasta `endsAt` (epoch ms), tickeando en vivo. Puro
 * display — sin efectos secundarios (haptics, notificaciones, auto-skip):
 * eso sigue siendo responsabilidad de RestTimer.tsx, que es lo único que
 * está montado mientras el usuario efectivamente entrena. Este hook lo
 * usan lecturas de solo lectura en otras pantallas (ver el badge del
 * header en Layout.tsx). */
export function useCountdown(endsAt: number | null): number {
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    if (!endsAt) {
      setRemaining(0)
      return
    }
    const tick = () => setRemaining(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)))
    tick()
    const interval = setInterval(tick, 250)
    return () => clearInterval(interval)
  }, [endsAt])

  return remaining
}
