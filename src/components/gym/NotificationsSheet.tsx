import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Bell, Dumbbell, Timer, Trophy, Users, X } from 'lucide-react'
import { db } from '@/db/schema'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { cn, formatDate } from '@/lib/utils'
import ResponsiveSheet from '@/components/ui/ResponsiveSheet'
import { EmptyState } from '@/components/ui/Card'
import type { AppNotification, NotificationType } from '@/types'

const TYPE_LABELS: Record<NotificationType, string> = {
  pr: 'Récords',
  weight_recommendation: 'Pesos',
  rest_recommendation: 'Descanso',
  update: 'Novedades',
  coach: 'Coach',
}

const TYPE_ICONS: Record<NotificationType, typeof Trophy> = {
  pr: Trophy,
  weight_recommendation: Dumbbell,
  rest_recommendation: Timer,
  update: Bell,
  coach: Users,
}

/** A dónde navega tocar una notificación de cada tipo — mismas pestañas de
 * Progreso donde el usuario puede ver el dato completo (gráfico, sugerencia
 * de descanso, lista de récords). `update` no navega, es solo texto. */
const TYPE_ROUTE: Partial<Record<NotificationType, string>> = {
  pr: '/progreso?tab=prs',
  weight_recommendation: '/progreso?tab=charts',
  rest_recommendation: '/progreso?tab=rest',
  coach: '/rutinas',
}

export default function NotificationsSheet({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const userId = useCurrentUserId()
  const [filter, setFilter] = useState<NotificationType | 'all'>('all')

  const notifications = useLiveQuery(
    () =>
      userId
        ? db.notifications
            .where('userId')
            .equals(userId)
            .reverse()
            .sortBy('createdAt')
        : [],
    [userId]
  ) ?? []

  const presentTypes = useMemo(
    () => [...new Set(notifications.map((n) => n.type))],
    [notifications]
  )
  const filtered = filter === 'all' ? notifications : notifications.filter((n) => n.type === filter)

  const handleTap = async (n: AppNotification) => {
    if (n.read === 0) await db.notifications.update(n.id, { read: 1 })
    const route = TYPE_ROUTE[n.type]
    if (route) {
      onClose()
      navigate(route)
    }
  }

  return (
    <ResponsiveSheet onClose={onClose} panelClassName="flex max-h-[85vh] flex-col">
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <h2 className="text-lg font-bold">Notificaciones</h2>
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-fill text-ink-2 active:bg-fill-2"
        >
          <X size={16} />
        </button>
      </div>

      {presentTypes.length > 1 && (
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-6 pb-2 [scrollbar-width:none]">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'flex h-9 shrink-0 items-center whitespace-nowrap rounded-full px-3.5 text-sm font-semibold transition-colors',
              filter === 'all' ? 'bg-accent text-bg' : 'bg-fill text-ink-2 active:bg-fill-2'
            )}
          >
            Todas
          </button>
          {presentTypes.map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={cn(
                'flex h-9 shrink-0 items-center whitespace-nowrap rounded-full px-3.5 text-sm font-semibold transition-colors',
                filter === type ? 'bg-accent text-bg' : 'bg-fill text-ink-2 active:bg-fill-2'
              )}
            >
              {TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-1">
        {filtered.length === 0 && (
          <EmptyState
            icon={<Bell size={28} />}
            title="Sin notificaciones"
            description="Los récords, pesos y descansos recomendados van a aparecer acá."
          />
        )}
        {filtered.map((n) => {
          const Icon = TYPE_ICONS[n.type]
          return (
            <button
              key={n.id}
              onClick={() => handleTap(n)}
              className="flex w-full items-start gap-3 rounded-xl bg-surface p-3.5 text-left"
            >
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                <Icon size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-semibold">{n.title}</p>
                  {n.read === 0 && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
                </div>
                <p className="mt-0.5 text-[13px] leading-snug text-ink-2">{n.body}</p>
                <p className="mt-1 text-[11px] text-ink-3">{formatDate(n.createdAt)}</p>
              </div>
            </button>
          )
        })}
      </div>
    </ResponsiveSheet>
  )
}
