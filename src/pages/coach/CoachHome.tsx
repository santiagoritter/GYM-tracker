import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronRight, Search, Settings, UserPlus, Users } from 'lucide-react'
import { fetchMyClients, type ClientSummary } from '@/lib/coachQueries'
import { fetchUnreadByClient } from '@/lib/coachChat'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import { Card, EmptyState, Row } from '@/components/ui/Card'
import ClientDetailPanel from '@/components/gym/ClientDetailPanel'

type LoadState = { s: 'loading' } | { s: 'error'; m: string } | { s: 'ok'; clients: ClientSummary[] }

/**
 * Hub del coach. Mobile: lista de alumnos (tocar uno abre su pantalla). Desktop
 * (≥1024px): master-detail — lista a la izquierda y el panel completo del
 * alumno seleccionado (progreso, rutinas, mensajes) a la derecha, sin salir de
 * la pantalla. La selección vive en la URL (`?alumno=<id>&chat=1`), así se puede
 * recargar o compartir el enlace.
 */
export default function CoachHome() {
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const [params, setParams] = useSearchParams()
  const [state, setState] = useState<LoadState>({ s: 'loading' })
  const [query, setQuery] = useState('')
  const [unread, setUnread] = useState<Map<string, number>>(new Map())

  const selectedId = params.get('alumno')
  const openChat = params.get('chat') === '1'

  const load = useCallback(() => {
    fetchUnreadByClient().then(setUnread).catch(() => undefined)
    fetchMyClients()
      .then((clients) => setState({ s: 'ok', clients }))
      .catch((e: unknown) => setState({ s: 'error', m: e instanceof Error ? e.message : 'Error' }))
  }, [])

  useEffect(load, [load])

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
              <Row
                key={c.clientId}
                onClick={() => select(c.clientId)}
                className={cn(isDesktop && selectedId === c.clientId && 'bg-fill')}
              >
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

  if (!isDesktop) {
    return (
      /* Sin header propio sticky: esta pantalla vive dentro de AppShell
         (pestaña "Coach" de la tab bar), el header global ya está arriba. */
      <div className="mx-auto content-width space-y-4">
        {header}
        {list}
      </div>
    )
  }

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-[20rem_minmax(0,1fr)] items-start gap-8">
      <aside className="space-y-4">
        {header}
        {list}
      </aside>
      <section aria-live="polite">
        {selectedId ? (
          <ClientDetailPanel
            key={selectedId}
            clientId={selectedId}
            inlineChat
            initialSection={openChat ? 'mensajes' : 'progreso'}
            onOpenChat={() => setParams({ alumno: selectedId, chat: '1' })}
            onEnded={() => {
              setParams({})
              load()
            }}
          />
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
