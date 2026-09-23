import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, CircleAlert, Search, Trophy } from 'lucide-react'
import {
  filterRoster,
  isInactive,
  lastWorkoutLabel,
  sortRoster,
  type RosterClient,
  type RosterFilter,
  type RosterSortKey,
} from '@/lib/coachRoster'
import { cn } from '@/lib/utils'

// Sin columnas de PRs/Mensajes aparte: en el panel maestro angosto (26rem,
// master-detail desde 1280px) una tabla de 5 columnas apretaba tanto que el
// navegador terminaba colapsando esas dos a un ancho casi invisible —
// confirmado visualmente, no era una hipótesis. Van como indicadores
// inline junto al nombre, que ocupan bien poco y se leen igual de rápido.
const COLUMNS: { key: RosterSortKey; label: string; align?: 'right'; width: string }[] = [
  { key: 'name', label: 'Alumno', width: 'w-[52%]' },
  { key: 'lastWorkout', label: 'Último entreno', width: 'w-[30%]' },
  { key: 'week', label: 'Semana', align: 'right', width: 'w-[18%]' },
]

const FILTERS: { id: RosterFilter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'inactive', label: 'Inactivos' },
  { id: 'unread', label: 'Con mensajes' },
]

/**
 * Tablero de alumnos en tabla (desktop, ≥1024px). Reemplaza la lista simple
 * que se usaba también en escritorio — con 20-30 alumnos, un coach necesita
 * escanear último entreno/adherencia/mensajes de un vistazo, no abrir uno
 * por uno. En mobile se sigue usando la lista (`CoachHome.tsx`).
 */
export default function CoachRosterTable({
  rows,
  unread,
  selectedId,
  onSelect,
}: {
  rows: RosterClient[]
  /** Se combina con `row.unread` (el fetch inicial de la RPC): el vivo
   * (Realtime, `useCoachUnread`) gana si hay un valor más reciente. */
  unread: Map<string, number>
  selectedId: string | null
  onSelect: (clientId: string) => void
}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<RosterFilter>('all')
  const [sortKey, setSortKey] = useState<RosterSortKey>('lastWorkout')
  const [sortDir, setSortDir] = useState<1 | -1>(1)

  const withLiveUnread = useMemo(
    () => rows.map((r) => ({ ...r, unread: unread.get(r.clientId) ?? r.unread })),
    [rows, unread]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = q
      ? withLiveUnread.filter(
          (c) => (c.displayName ?? '').toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
        )
      : withLiveUnread
    return sortRoster(filterRoster(base, filter), sortKey, sortDir)
  }, [withLiveUnread, query, filter, sortKey, sortDir])

  const toggleSort = (key: RosterSortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 1 ? -1 : 1))
    else {
      setSortKey(key)
      setSortDir(key === 'lastWorkout' ? -1 : 1)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[12rem] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar alumno"
            aria-label="Buscar alumno"
            className="h-10 w-full rounded-sm bg-surface pl-10 pr-3 text-[14px] outline-none ring-1 ring-line-2 focus:ring-accent"
          />
        </label>
        <div className="flex gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'h-10 whitespace-nowrap rounded-sm px-3 text-[13px] font-medium',
                filter === f.id ? 'bg-accent text-bg' : 'bg-surface text-ink-2 hover:text-ink'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-3">Ningún alumno coincide.</p>
      ) : (
        <div className="overflow-hidden rounded-md border border-line">
          {/* table-fixed + anchos explícitos: sin esto, `whitespace-nowrap`
              en las celdas (para que "Hace 8 días" no corte feo) empujaba a
              la tabla entera a desbordar el panel angosto (26rem) en vez de
              respetar w-full — confirmado visualmente, la columna Semana
              quedaba directamente invisible. Con table-fixed el ancho de
              columna es la autoridad, el contenido se ajusta a eso. */}
          <table className="w-full table-fixed border-collapse text-[14px]">
            <thead>
              <tr className="border-b border-line bg-surface text-[12px] text-ink-3">
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    scope="col"
                    className={cn(
                      'px-4 py-2.5 font-medium',
                      col.width,
                      col.align === 'right' ? 'text-right' : 'text-left'
                    )}
                  >
                    <button
                      onClick={() => toggleSort(col.key)}
                      className={cn(
                        'inline-flex items-center gap-1 hover:text-ink-2',
                        col.align === 'right' && 'flex-row-reverse'
                      )}
                    >
                      {col.label}
                      {sortKey === col.key ? (
                        sortDir === 1 ? (
                          <ArrowUp size={12} />
                        ) : (
                          <ArrowDown size={12} />
                        )
                      ) : (
                        <ArrowUpDown size={12} className="opacity-40" />
                      )}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const inactive = isInactive(c)
                const selected = selectedId === c.clientId
                return (
                  <tr
                    key={c.clientId}
                    onClick={() => onSelect(c.clientId)}
                    className={cn(
                      'cursor-pointer border-b border-line-2 last:border-0',
                      selected ? 'bg-fill' : 'hover:bg-fill/60'
                    )}
                  >
                    <td className="min-w-0 px-4 py-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{c.displayName || c.email}</p>
                          <p className="truncate text-[12px] text-ink-3">{c.email}</p>
                        </div>
                        {c.unread > 0 && (
                          <span
                            aria-label={`${c.unread} mensajes sin leer`}
                            className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold tabular-nums text-bg"
                          >
                            {c.unread}
                          </span>
                        )}
                        {c.prs7d > 0 && (
                          <span
                            aria-label={`${c.prs7d} récords personales en los últimos 7 días`}
                            className="flex shrink-0 items-center gap-0.5 text-[12px] font-semibold text-accent"
                          >
                            <Trophy size={12} /> {c.prs7d}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-start gap-1.5', inactive && 'text-danger')}>
                        {inactive && <CircleAlert size={13} className="mt-0.5 shrink-0" />}
                        {lastWorkoutLabel(c.lastWorkoutAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-2">
                      {c.workouts7d}
                      {c.weeklyGoal ? `/${c.weeklyGoal}` : ''}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
