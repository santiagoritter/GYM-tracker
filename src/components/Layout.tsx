import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { animate, motion, useMotionValue, useReducedMotion } from 'motion/react'
import { Calendar, Dumbbell, Flame, House, LogOut, Shield, TrendingUp, User } from 'lucide-react'
import { workoutsFor } from '@/db/scoped'
import { useAuthStore } from '@/stores/authStore'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { useReminderScheduler } from '@/lib/reminders'
import { cn, formatDuration } from '@/lib/utils'

const TABS = [
  { to: '/', label: 'Hoy', icon: House },
  { to: '/rutinas', label: 'Rutinas', icon: Calendar },
  { to: '/ejercicios', label: 'Ejercicios', icon: Dumbbell },
  { to: '/progreso', label: 'Progreso', icon: TrendingUp },
  { to: '/perfil', label: 'Yo', icon: User },
]

// Margen fijo a cada lado de la pastilla dentro de su columna — sin esto,
// en el primer y último tab tocaba el borde de la cápsula exterior.
const PILL_INSET = 6

function activeTabIndex(pathname: string): number {
  const i = TABS.findIndex(({ to }) => (to === '/' ? pathname === '/' : pathname.startsWith(to)))
  return i === -1 ? 0 : i
}

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { name, role, clearSession } = useAuthStore()
  const userId = useCurrentUserId()
  const reduced = useReducedMotion()
  useReminderScheduler()
  const activeWorkout = useLiveQuery(
    () => (userId ? workoutsFor(userId).filter((w) => !w.finishedAt).first() : undefined),
    [userId]
  )

  // Ancho de cada columna de la tab bar, medido en vivo: hace falta en
  // píxeles reales para poder animar/arrastrar la pastilla por posición
  // (`x`), no hay forma de hacerlo solo con clases de Tailwind.
  const tabRowRef = useRef<HTMLDivElement>(null)
  const [tabWidth, setTabWidth] = useState(0)
  useEffect(() => {
    const row = tabRowRef.current
    if (!row) return
    const measure = () => setTabWidth(row.getBoundingClientRect().width / TABS.length)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(row)
    return () => ro.disconnect()
  }, [])

  const activeIndex = activeTabIndex(location.pathname)
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
    const nearest = Math.min(TABS.length - 1, Math.max(0, Math.round((x.get() - PILL_INSET) / tabWidth)))
    animate(x, pillX(nearest), spring)
    if (nearest !== activeIndex) navigate(TABS[nearest].to)
  }

  const handleLogout = () => {
    clearSession()
    navigate('/login', { replace: true })
  }

  const initials = (name ?? 'U')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-bg">
      {/* Header glass */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 pt-[env(safe-area-inset-top)] pb-0">
        <div className="glass absolute inset-0 -z-10 border-b border-line" />
        <button
          onClick={() => navigate('/perfil')}
          className="flex min-h-11 items-center gap-2.5 py-3"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-bg">
            {initials}
          </div>
          <span className="max-w-[140px] truncate text-[15px] font-semibold text-ink">
            {name?.split(' ')[0] ?? 'Campeón'}
          </span>
          {role === 'admin' && (
            <span className="rounded-xs bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-accent">
              Admin
            </span>
          )}
        </button>
        <div className="flex items-center gap-0.5">
          {role === 'admin' && (
            <button
              onClick={() => navigate('/admin')}
              className="flex h-11 items-center rounded-sm px-3 text-xs font-medium text-ink-2 transition-colors active:bg-fill"
            >
              <Shield size={15} className="mr-1 inline" />Panel
            </button>
          )}
          <button
            onClick={handleLogout}
            className="flex h-11 items-center rounded-sm px-3 text-xs font-medium text-ink-3 transition-colors active:bg-fill"
          >
            <LogOut size={15} className="mr-1 inline" />Salir
          </button>
        </div>
      </header>

      <main className="flex-1 animate-fade-up px-4 pb-36 pt-3">
        <Outlet />
      </main>

      {/* Pill de entreno activo */}
      {activeWorkout && (
        <button
          onClick={() => navigate(`/entreno/${activeWorkout.id}`)}
          className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] left-1/2 z-50 animate-scale-in"
        >
          <div className="flex items-center gap-2.5 rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-bg">
            <Flame size={15} fill="currentColor" />
            <span>Entreno en curso</span>
            <span className="opacity-70">·</span>
            <span className="font-mono text-xs tabular-nums">{formatDuration(activeWorkout.startedAt)}</span>
          </div>
        </button>
      )}

      {/* Tab bar iOS 26/27 — cápsula flotante, más cerca del borde que en
          el primer intento (px-3/pb-2 originales quedaban muy alta). */}
      <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-lg -translate-x-1/2 px-3 pb-[calc(0.25rem+env(safe-area-inset-bottom))]">
        <div className="glass glass-edge-top overflow-hidden rounded-full">
          <div ref={tabRowRef} className="relative flex items-stretch justify-around">
            {TABS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'relative flex flex-1 flex-col items-center gap-1 py-4 text-[11px] font-medium tracking-wide transition-colors duration-150',
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
                    <Icon size={24} strokeWidth={isActive ? 2.2 : 1.8} />
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
                dragConstraints={{ left: PILL_INSET, right: pillX(TABS.length - 1) }}
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
