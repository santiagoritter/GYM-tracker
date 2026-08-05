import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion, useReducedMotion } from 'motion/react'
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

export default function Layout() {
  const navigate = useNavigate()
  const { name, role, clearSession } = useAuthStore()
  const userId = useCurrentUserId()
  const reduced = useReducedMotion()
  useReminderScheduler()
  const activeWorkout = useLiveQuery(
    () => (userId ? workoutsFor(userId).filter((w) => !w.finishedAt).first() : undefined),
    [userId]
  )

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

      <main className="flex-1 animate-fade-up px-4 pb-32 pt-3">
        <Outlet />
      </main>

      {/* Pill de entreno activo */}
      {activeWorkout && (
        <button
          onClick={() => navigate(`/entreno/${activeWorkout.id}`)}
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-1/2 z-50 animate-scale-in"
        >
          <div className="flex items-center gap-2.5 rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-bg">
            <Flame size={15} fill="currentColor" />
            <span>Entreno en curso</span>
            <span className="opacity-70">·</span>
            <span className="font-mono text-xs tabular-nums">{formatDuration(activeWorkout.startedAt)}</span>
          </div>
        </button>
      )}

      {/* Tab bar iOS — semi-flotante: un margen chico la despega de los
          bordes en vez del flush edge-to-edge de antes. */}
      <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-lg -translate-x-1/2 px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        <div className="glass glass-edge-top overflow-hidden rounded-2xl">
          <div className="flex items-stretch justify-around">
            {TABS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex flex-1 flex-col items-center gap-[3px] py-2.5 text-[10px] font-medium tracking-wide transition-colors duration-150',
                    isActive
                      ? 'text-accent'
                      : 'text-ink-3 active:text-ink-2'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="relative flex h-7 w-7 items-center justify-center">
                      {isActive && (
                        <motion.span
                          layoutId="tab-pill"
                          className="absolute inset-0 rounded-xl bg-accent/15"
                          transition={
                            reduced
                              ? { duration: 0 }
                              : { type: 'spring', damping: 30, stiffness: 300 }
                          }
                        />
                      )}
                      {/* El estado activo se marca con color, fondo y grosor
                          de trazo, no con un halo lima alrededor del icono. */}
                      <Icon
                        size={20}
                        strokeWidth={isActive ? 2.2 : 1.8}
                        className="relative z-10"
                      />
                    </span>
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
    </div>
  )
}
