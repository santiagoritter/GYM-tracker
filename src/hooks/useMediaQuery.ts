import { useEffect, useState } from 'react'

/** Se suscribe a un media query y re-renderiza en cada cambio (resize,
 * rotación, ventana movida a otro monitor) — `matchMedia` solo da el
 * estado en el momento de llamarlo, hace falta el listener `change` para
 * que no quede pegado al valor de cuando montó el componente. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const mql = window.matchMedia(query)
    setMatches(mql.matches)
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/** Breakpoint `lg` de Tailwind (1024px) — a partir de acá el layout pasa
 * de tab bar + columna angosta a sidebar + multi-columna (ver DESIGN.md
 * §3 "Ancho de contenido"). */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)')
}
