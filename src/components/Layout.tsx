import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Calendar, Dumbbell, Flame, House, LogOut, Shield, TrendingUp, User } from 'lucide-react'
import { db } from '@/db/schema'
import { useAuthStore } from '@/stores/authStore'
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
  useReminderScheduler()
  const activeWorkout = useLiveQuery(
    () => db.workouts.filter((w) => !w.finishedAt).first(),
    []
  )

  const handleLogout = () => {
    clearSession()
    navigate('/login', { replace: true })
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col">
      {/* Header con usuario */}
      <header className="flex items-center justify-between px-4 pt-5 pb-1">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-bg">
            {(name ?? 'U').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
          </div>
          <span className="text-sm font-medium text-ink-2 max-w-[140px] truncate">
            {name ?? 'Usuario'}
          </span>
          {role === 'admin' && (
            <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-accent">
              ADMIN
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {role === 'admin' && (
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-3 active:bg-surface"
            >
              <Shield size={14} /> Panel
            </button>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-3 active:bg-surface"
          >
            <LogOut size={14} /> Salir
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 pb-24 pt-4">
        <Outlet />
      </main>

      {activeWorkout && (
        <button
          onClick={() => navigate(`/entreno/${activeWorkout.id}`)}
          className="animate-fade-up fixed bottom-20 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-bold text-bg shadow-lg shadow-accent/20"
        >
          <Flame size={16} /> Entreno en curso ·{' '}
          {formatDuration(activeWorkout.startedAt)}
        </button>
      )}
      <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-lg -translate-x-1/2 border-t border-line bg-bg/95 backdrop-blur">
        <div className="flex items-stretch justify-around pb-[env(safe-area-inset-bottom)]">
          {TABS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors',
                  isActive ? 'text-accent' : 'text-ink-3'
                )
              }
            >
              <Icon size={22} strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
