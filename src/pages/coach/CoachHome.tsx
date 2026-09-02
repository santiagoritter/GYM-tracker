import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Settings, UserPlus, Users } from 'lucide-react'
import { fetchMyClients, type ClientSummary } from '@/lib/coachQueries'
import { Card, EmptyState, Row } from '@/components/ui/Card'

export default function CoachHome() {
  const navigate = useNavigate()
  const [state, setState] = useState<
    { s: 'loading' } | { s: 'error'; m: string } | { s: 'ok'; clients: ClientSummary[] }
  >({ s: 'loading' })

  useEffect(() => {
    fetchMyClients()
      .then((clients) => setState({ s: 'ok', clients }))
      .catch((e: unknown) => setState({ s: 'error', m: e instanceof Error ? e.message : 'Error' }))
  }, [])

  return (
    <div className="mx-auto min-h-screen content-width pb-24 lg:max-w-4xl">
      <header className="glass sticky top-0 z-30 flex items-center justify-between border-b border-line px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-accent" />
          <h1 className="font-semibold">Alumnos</h1>
        </div>
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

      <div className="px-4 py-4">
        {state.s === 'loading' ? (
          <p className="py-12 text-center text-sm text-ink-3">Cargando…</p>
        ) : state.s === 'error' ? (
          <EmptyState icon={<Users size={28} />} title="No se pudo cargar" description={state.m} />
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
          <Card>
            {state.clients.map((c) => (
              <Row key={c.clientId} onClick={() => navigate(`/coach/alumno/${c.clientId}`)}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium">{c.displayName || c.email}</p>
                  <p className="truncate text-[13px] text-ink-3">{c.email}</p>
                </div>
                <ChevronRight size={16} className="shrink-0 text-ink-4" />
              </Row>
            ))}
          </Card>
        )}
      </div>
    </div>
  )
}
