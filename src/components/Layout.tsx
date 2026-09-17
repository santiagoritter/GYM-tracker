import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { animate, motion, useMotionValue, useReducedMotion } from 'motion/react'
import { useReminderScheduler } from '@/lib/reminders'
import { useWorkoutActivityReconciler } from '@/hooks/useWorkoutActivityReconciler'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import { getTabs, type NavTab } from '@/lib/navTabs'
import AppHeader from '@/components/gym/AppHeader'

// Margen fijo a cada lado de la pastilla dentro de su columna — sin esto,
// en el primer y último tab tocaba el borde de la cápsula exterior.
const PILL_INSET = 6

// -1 si la ruta actual no es ninguno de los tabs — pasa en cualquier
// pantalla "hija" del AppShell que no tiene tab propio (Ajustes,
// Calculadora, Recordatorios, Calorías, Entrenos pasados, FAQ, Admin…). El
// caller decide qué hacer con -1: acá se elige no mover la pastilla, no
// defaultear a Home (ver el bug que corrige más abajo).
function activeTabIndex(tabs: NavTab[], pathname: string): number {
  return tabs.findIndex(({ to }) => (to === '/' ? pathname === '/' : pathname.startsWith(to)))
}

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const reduced = useReducedMotion()
  const role = useAuthStore((s) => s.role)
  const tabs = useMemo(() => getTabs(role), [role])
  useReminderScheduler()
  useWorkoutActivityReconciler()

  // Ancho de cada columna de la tab bar, medido en vivo: hace falta en
  // píxeles reales para poder animar/arrastrar la pastilla por posición
  // (`x`), no hay forma de hacerlo solo con clases de Tailwind.
  const tabRowRef = useRef<HTMLDivElement>(null)
  const [tabWidth, setTabWidth] = useState(0)
  useEffect(() => {
    const row = tabRowRef.current
    if (!row) return
    const measure = () => setTabWidth(row.getBoundingClientRect().width / tabs.length)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(row)
    return () => ro.disconnect()
  }, [tabs.length])

  // Alto del header, medido en vivo (mismo criterio que tabWidth arriba):
  // hace falta para separar el contenido de abajo, ahora que el header es
  // `fixed` (ver por qué en AppHeader.tsx) y salió del flujo normal —
  // nada empuja a <main> hacia abajo solo, hay que decirle cuánto medir a
  // mano. Cambia con el contenido real del header (aparece/desaparece la
  // píldora de entreno en curso, el badge de calorías, etc.), así que se
  // mide en vez de hardcodear un número. `useLayoutEffect`, no `useEffect`:
  // corre antes del primer paint, así el contenido nunca arranca pegado
  // debajo del header y "salta" hacia abajo un frame después.
  const headerWrapRef = useRef<HTMLDivElement>(null)
  const [headerHeight, setHeaderHeight] = useState(0)
  useLayoutEffect(() => {
    const el = headerWrapRef.current
    if (!el) return
    const measure = () => setHeaderHeight(el.getBoundingClientRect().height)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // La pastilla necesita un índice siempre válido. En una ruta sin tab
  // propio (ej. /perfil, /ajustes — llegadas desde el avatar del header,
  // ya que "Yo" se sacó de la barra) `activeTabIndex` da -1 — acá se
  // mantiene el último tab que sí matcheó en vez de saltar a Home (bug
  // original reportado: "entrás a Ajustes y la pastilla se va a Hoy").
  // Patrón de "recordar info del render anterior" (ajustar estado durante
  // el render, sin efecto) — https://react.dev/learn/you-might-not-need-an-effect.
  const rawIndex = activeTabIndex(tabs, location.pathname)
  const [activeIndex, setActiveIndex] = useState(() => Math.max(rawIndex, 0))
  const [lastPathname, setLastPathname] = useState(location.pathname)
  if (location.pathname !== lastPathname) {
    setLastPathname(location.pathname)
    if (rawIndex !== -1) setActiveIndex(rawIndex)
  }
  const pillX = (i: number) => i * tabWidth + PILL_INSET

  // Motion value propio (no el prop `animate`): así se puede comandar la
  // animación de snap a mano desde `onDragEnd` sin depender de que
  // `activeIndex` haya cambiado de valor — ese era el bug reportado ("no
  // se clava"): si soltabas el arrastre sin cruzar al tab siguiente,
  // activeIndex quedaba igual, el prop `animate` no volvía a dispararse, y
  // la pastilla se quedaba flotando a mitad de camino en vez de volver.
  const x = useMotionValue(0)
  const positionedRef = useRef(false)
  const spring = reduced
    ? { duration: 0 }
    : { type: 'spring' as const, damping: 30, stiffness: 300 }

  useEffect(() => {
    if (!tabWidth) return
    // La primerísima vez que se mide el ancho (recién montado), la
    // pastilla aparece directo en su lugar — animarla desde x:0 se vería
    // como si entrara deslizando desde la izquierda en cada carga.
    if (!positionedRef.current) {
      positionedRef.current = true
      x.set(pillX(activeIndex))
      return
    }
    const controls = animate(x, pillX(activeIndex), spring)
    return () => controls.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, tabWidth, reduced])

  const handlePillDragEnd = () => {
    if (!tabWidth) return
    const nearest = Math.min(tabs.length - 1, Math.max(0, Math.round((x.get() - PILL_INSET) / tabWidth)))
    animate(x, pillX(nearest), spring)
    if (nearest !== activeIndex) navigate(tabs[nearest].to)
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-bg">
      {/* Header glass — fixed, siempre visible arriba pase lo que pase con
          el scroll (`sticky` no se quedaba pegado en el dispositivo real,
          ver el comentario largo en AppHeader.tsx). El aviso de entreno
          en curso vive acá adentro, a la misma altura que el avatar y las
          calorías (antes era una píldora flotante sobre la tab bar, mismo
          aviso duplicado en Home.tsx) — así se ve desde cualquier pantalla
          que use este Layout, no solo scrolleando. */}
      <div ref={headerWrapRef} className="fixed top-0 left-1/2 z-30 w-full max-w-lg -translate-x-1/2">
        <AppHeader />
      </div>

      <main
        className="flex-1 animate-fade-up px-4 pb-[8.5rem]"
        style={{ paddingTop: headerHeight + 12 }}
      >
        <Outlet />
      </main>

      {/* Tab bar iOS 26/27 — cápsula flotante, más cerca del borde que en
          el primer intento (px-3/pb-2 originales quedaban muy alta). */}
      <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-lg -translate-x-1/2 px-3 pb-[calc(0.25rem+env(safe-area-inset-bottom))]">
        <div className="glass glass-edge-top overflow-hidden rounded-full">
          <div ref={tabRowRef} className="relative flex items-stretch justify-around">
            {tabs.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'relative flex flex-1 flex-col items-center gap-1 py-3 text-[12px] font-medium tracking-wide transition-colors duration-150',
                    isActive
                      // Por encima de la pastilla (z-20): si no, el blur de
                      // atrás la ensucia. pointer-events-none deja pasar el
                      // toque a la pastilla para que el arrastre siga
                      // funcionando — tocar el tab ya activo no hacía nada
                      // igual.
                      ? 'z-30 pointer-events-none text-accent'
                      : 'z-10 text-ink-3 active:text-ink-2'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
                    {label}
                  </>
                )}
              </NavLink>
            ))}

            {/* La "gota": cápsula que envuelve ícono+label del tab activo
                entero (no solo el ícono), como el indicador de los tab
                bars nuevos de iOS. Se desliza sola al tocar otro tab y
                también se puede arrastrar con el dedo — al soltar, se
                clava (`animate(x, ...)` a mano, ver el motion value `x`
                más arriba) en el tab más cercano a donde quedó, cruce o
                no a otro tab. `PILL_INSET` la separa de los bordes
                izquierdo/derecho de la cápsula exterior en el primer y
                último tab. Vidrio propio (blur + tinte), no solo el
                relleno plano de antes — sigue siendo parte de la tab
                bar, una de las dos superficies donde DESIGN.md permite
                `backdrop-filter`. */}
            {tabWidth > 0 && (
              <motion.div
                drag="x"
                dragConstraints={{ left: PILL_INSET, right: pillX(tabs.length - 1) }}
                dragElastic={0}
                dragMomentum={false}
                onDragEnd={handlePillDragEnd}
                // Feedback táctil: mientras se arrastra, crece un toque —
                // confirma "esto es lo que estás moviendo" sin depender
                // solo del cursor/dedo. Vuelve sola a 1 al soltar, motion
                // ya maneja esa transición.
                whileDrag={{ scale: reduced ? 1 : 1.12 }}
                style={{ x, width: tabWidth - PILL_INSET * 2 }}
                className="absolute inset-y-1.5 left-0 z-20 touch-none rounded-full bg-accent/20 backdrop-blur-xs"
              />
            )}
          </div>
        </div>
      </nav>
    </div>
  )
}
