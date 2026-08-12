import { useEffect, useState } from 'react'
import { formatDuration } from '@/lib/utils'

/** Duración tickeando en vivo (mm:ss / hh:mm:ss) desde un ISO de inicio.
 * `formatDuration` sola solo calcula UNA vez, en el momento del render —
 * sin este intervalo el texto queda congelado hasta que algo más
 * provoque un re-render (era el bug: "el contador no avanza"). */
export function useElapsedDuration(startedAt: string | undefined): string {
  const [elapsed, setElapsed] = useState('')

  useEffect(() => {
    if (!startedAt) {
      setElapsed('')
      return
    }
    const tick = () => setElapsed(formatDuration(startedAt))
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [startedAt])

  return elapsed
}
