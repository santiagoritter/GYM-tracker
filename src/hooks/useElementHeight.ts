import { useLayoutEffect, useRef, useState } from 'react'

/**
 * Alto de un elemento, medido en vivo con ResizeObserver. `useLayoutEffect`
 * (no `useEffect`): mide antes del primer paint, así lo que dependa del alto
 * no "salta" un frame después. Devuelve el ref a colgar del elemento y el
 * alto en px (0 hasta la primera medición).
 */
export function useElementHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [height, setHeight] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setHeight(el.getBoundingClientRect().height)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, height] as const
}
