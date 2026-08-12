import { NavLink, Outlet } from 'react-router-dom'
import { useReminderScheduler } from '@/lib/reminders'
import { cn } from '@/lib/utils'
import { TABS } from '@/lib/navTabs'
import AppHeader from '@/components/gym/AppHeader'

/**
 * Layout de escritorio (≥1024px): sidebar fijo en vez de tab bar inferior,
 * mismo header que mobile. Sin pastilla animada ni ResizeObserver — en
 * desktop no hay gesto de arrastre que soportar, el estado activo alcanza
 * con fondo + color (ver Layout.tsx para la versión mobile con drag).
 */
export default function LayoutDesktop() {
  useReminderScheduler()

  return (
    <div className="flex min-h-screen bg-bg">
      <nav className="sticky top-0 flex h-screen w-56 shrink-0 flex-col gap-1 border-r border-line px-3 py-6">
        {TABS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-sm px-3 py-2.5 text-[14px] font-medium transition-colors',
                isActive ? 'bg-fill text-ink' : 'text-ink-3 hover:text-ink-2'
              )
            }
          >
            <Icon size={20} strokeWidth={1.8} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        <main className="flex-1 animate-fade-up px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
