import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
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
        <div className="flex items-center gap-2.5 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-black shadow-accent">
            {initials}
          </div>
          <span className="max-w-[140px] truncate text-[15px] font-semibold text-ink">
            {name?.split(' ')[0] ?? 'Campeón'}
          </span>
          {role === 'admin' && (
            <span className="rounded-md bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-accent">
              ADMIN
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {role === 'admin' && (
            <button
              onClick={() => navigate('/admin')}
              className="rounded-xl px-3 py-1.5 text-xs font-medium text-ink-2 transition-colors active:bg-fill"
            >
              <Shield size={15} className="inline mr-1" />Panel
            </button>
          )}
          <button
            onClick={handleLogout}
            className="rounded-xl px-3 py-1.5 text-xs font-medium text-ink-3 transition-colors active:bg-fill"
          >
            <LogOut size={15} className="inline mr-1" />Salir
          </button>
        </div>
      </header>

      <main className="flex-1 animate-fade-up px-4 pb-28 pt-3">
        <Outlet />
      </main>

      {/* Pill de entreno activo */}
      {activeWorkout && (
        <button
          onClick={() => navigate(`/entreno/${activeWorkout.id}`)}
          className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-1/2 z-50 -translate-x-1/2 animate-scale-in"
        >
          <div className="flex items-center gap-2.5 rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-black shadow-accent">
            <Flame size={15} fill="currentColor" />
            <span>Entreno en curso</span>
            <span className="opacity-70">·</span>
            <span className="font-mono text-xs">{formatDuration(activeWorkout.startedAt)}</span>
          </div>
        </button>
      )}

      {/* Tab bar iOS */}
      <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-lg -translate-x-1/2">
        <div className="glass border-t border-line">
          <div className="flex items-stretch justify-around pb-[env(safe-area-inset-bottom)]">
            {TABS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex flex-1 flex-col items-center gap-[3px] py-2.5 text-[10px] font-medium tracking-wide transition-all duration-150',
                    isActive
                      ? 'text-accent'
                      : 'text-ink-3 active:text-ink-2'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-xl transition-all duration-150',
                      isActive && 'bg-accent/10'
                    )}>
                      <Icon
                        size={20}
                        strokeWidth={isActive ? 2.2 : 1.8}
                        className={cn(isActive && 'drop-shadow-[0_0_6px_rgba(232,255,71,0.5)]')}
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
