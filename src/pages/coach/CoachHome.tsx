import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ChevronRight, Search, Settings, UserPlus, Users } from 'lucide-react'
import { fetchMyClients, fetchCoachRoster, type ClientSummary } from '@/lib/coachQueries'
import { useCoachUnread } from '@/hooks/useCoachUnread'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import { Card, EmptyState, Row } from '@/components/ui/Card'
import ClientDetailPanel from '@/components/gym/ClientDetailPanel'
import CoachRosterTable from '@/components/gym/CoachRosterTable'
import type { RosterClient } from '@/lib/coachRoster'

type LoadState = { s: 'loading' } | { s: 'error'; m: string } | { s: 'ok'; clients: ClientSummary[] }
type RosterState = { s: 'loading' } | { s: 'error'; m: string } | { s: 'ok'; rows: RosterClient[] }

/**
 * Hub del coach. Mobile: lista simple de alumnos (tocar uno abre su
 * pantalla). Desktop (≥1024px): tablero en tabla (`CoachRosterTable`) con
 * último entreno, adherencia semanal, PRs y no leídos — antes era la misma
 * lista chica que en mobile, sin nada para escanear 20-30 alumnos de un
 * vistazo.
 *
 * Entre 1024 y 1279px la tabla ocupa todo el ancho y el detalle del alumno
 * reemplaza la pantalla (con "Volver"); desde 1280px (`xl:`) es
 * master-detail de verdad, los dos a la vez. La selección vive en la URL
 * (`?alumno=<id>&chat=1`), así se puede recargar o compartir el enlace.
 */
export default function CoachHome() {
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const [params, setParams] = useSearchParams()
  const [state, setState] = useState<LoadState>({ s: 'loading' })
  const [rosterState, setRosterState] = useState<RosterState>({ s: 'loading' })
  const [query, setQuery] = useState('')
  const { unread, markRead } = useCoachUnread()

  const selectedId = params.get('alumno')
  const openChat = params.get('chat') === '1'

  // Al abrir el chat de un alumno, su contador local se resetea ya — el
  // servidor lo marca leído de verdad dentro de ChatThread (markThreadRead),
  // esto es solo para que el badge no quede pegado hasta el próximo fetch.
  useEffect(() => {
    if (openChat && selectedId) markRead(selectedId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openChat, selectedId])

  const load = useCallback(() => {
    fetchMyClients()
      .then((clients) => setState({ s: 'ok', clients }))
      .catch((e: unknown) => setState({ s: 'error', m: e instanceof Error ? e.message : 'Error' }))
  }, [])

  const loadRoster = useCallback(() => {
    setRosterState({ s: 'loading' })
    fetchCoachRoster()
      .then((rows) => setRosterState({ s: 'ok', rows }))
      .catch((e: unknown) => setRosterState({ s: 'error', m: e instanceof Error ? e.message : 'Error' }))
  }, [])

  useEffect(load, [load])
  useEffect(() => {
    if (isDesktop) loadRoster()
  }, [isDesktop, loadRoster])

  const filtered = useMemo(() => {
    if (state.s !== 'ok') return []
    const q = query.trim().toLowerCase()
    if (!q) return state.clients
    return state.clients.filter(
      (c) => (c.displayName ?? '').toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    )
  }, [state, query])

  const select = (clientId: string) => {
    if (isDesktop) setParams({ alumno: clientId })
    else navigate(`/coach/alumno/${clientId}`)
  }

  const header = (
    <header className="flex items-center justify-between">
      <h1 className="text-2xl font-bold">Alumnos</h1>
      <div className="flex items-center gap-1">
        <button
          onClick={() => navigate('/coach/invitar')}
          aria-label="Invitar alumno"
          className="flex h-11 w-11 items-center justify-center text-ink-2"
        >
          <UserPlus size={20} />
        </button>
        <button
          onClick={() => navigate('/coach/perfil')}
          aria-label="Mi perfil de coach"
          className="flex h-11 w-11 items-center justify-center text-ink-2"
        >
          <Settings size={20} />
        </button>
      </div>
    </header>
  )

  // ── Mobile: lista simple, sin cambios de fondo ──────────────────────────
  if (!isDesktop) {
    const list =
      state.s === 'loading' ? (
        <p className="py-12 text-center text-sm text-ink-3">Cargando…</p>
      ) : state.s === 'error' ? (
        <EmptyState
          icon={<Users size={28} />}
          title="No se pudo cargar"
          description={state.m}
          action={
            <button onClick={load} className="h-11 rounded-sm bg-fill px-5 text-sm font-semibold text-ink-2">
              Reintentar
            </button>
          }
        />
      ) : state.clients.length === 0 ? (
        <EmptyState
          icon={<Users size={28} />}
          title="Todavía no tenés alumnos"
          description="Generá una invitación y pasásela por link o QR."
          action={
            <button
              onClick={() => navigate('/coach/invitar')}
              className="h-11 rounded-sm bg-accent px-5 text-sm font-bold text-bg"
            >
              Invitar
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {state.clients.length > 5 && (
            <label className="relative block">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar alumno"
                aria-label="Buscar alumno"
                className="h-11 w-full rounded-sm bg-surface pl-10 pr-3 text-[15px] outline-none ring-1 ring-line-2 focus:ring-accent"
              />
            </label>
          )}
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-3">Ningún alumno coincide.</p>
          ) : (
            <Card>
              {filtered.map((c) => (
                <Row key={c.clientId} onClick={() => select(c.clientId)}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium">{c.displayName || c.email}</p>
                    <p className="truncate text-[13px] text-ink-3">{c.email}</p>
                  </div>
                  {(unread.get(c.clientId) ?? 0) > 0 && (
                    <span
                      aria-label={`${unread.get(c.clientId)} mensajes sin leer`}
                      className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[12px] font-bold text-bg"
                    >
                      {unread.get(c.clientId)}
                    </span>
                  )}
                  <ChevronRight size={16} className="shrink-0 text-ink-4" />
                </Row>
              ))}
            </Card>
          )}
        </div>
      )

    return (
      /* Sin header propio sticky: esta pantalla vive dentro de AppShell
         (pestaña "Coach" de la tab bar), el header global ya está arriba. */
      <div className="mx-auto content-width space-y-4">
        {header}
        {list}
      </div>
    )
  }

  // ── Desktop: tablero en tabla + master-detail desde 1280px (xl:) ───────
  const table =
    rosterState.s === 'loading' ? (
      <p className="py-12 text-center text-sm text-ink-3">Cargando…</p>
    ) : rosterState.s === 'error' ? (
      <EmptyState
        icon={<Users size={28} />}
        title="No se pudo cargar"
        description={rosterState.m}
        action={
          <button onClick={loadRoster} className="h-11 rounded-sm bg-fill px-5 text-sm font-semibold text-ink-2">
            Reintentar
          </button>
        }
      />
    ) : rosterState.rows.length === 0 ? (
      <EmptyState
        icon={<Users size={28} />}
        title="Todavía no tenés alumnos"
        description="Generá una invitación y pasásela por link o QR."
        action={
          <button
            onClick={() => navigate('/coach/invitar')}
            className="h-11 rounded-sm bg-accent px-5 text-sm font-bold text-bg"
          >
            Invitar
          </button>
        }
      />
    ) : (
      <CoachRosterTable rows={rosterState.rows} unread={unread} selectedId={selectedId} onSelect={select} />
    )

  return (
    <div className="mx-auto w-full space-y-4 xl:grid xl:grid-cols-[26rem_minmax(0,1fr)] xl:items-start xl:gap-8 xl:space-y-0">
      <aside
        className={cn(
          'space-y-4 xl:sticky xl:top-[calc(var(--app-header-h,0px)+1.5rem)] xl:max-h-[calc(100vh-var(--app-header-h,0px)-3rem)] xl:overflow-y-auto',
          selectedId && 'hidden xl:block'
        )}
      >
        {header}
        {table}
      </aside>
      <section className={cn(!selectedId && 'hidden xl:block')} aria-live="polite">
        {selectedId ? (
          <>
            <button
              onClick={() => setParams({})}
              className="mb-3 flex h-11 items-center gap-1.5 text-sm font-medium text-ink-2 xl:hidden"
            >
              <ArrowLeft size={16} /> Alumnos
            </button>
            <ClientDetailPanel
              key={selectedId}
              clientId={selectedId}
              inlineChat
              initialSection={openChat ? 'mensajes' : 'progreso'}
              onOpenChat={() => setParams({ alumno: selectedId, chat: '1' })}
              onEnded={() => {
                setParams({})
                load()
                loadRoster()
              }}
            />
          </>
        ) : (
          <EmptyState
            icon={<Users size={28} />}
            title="Elegí un alumno"
            description="Vas a ver su progreso completo, sus rutinas y tus mensajes con él."
          />
        )}
      </section>
    </div>
  )
}
