import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { fetchMyClients, fetchMyCoach } from '@/lib/coachQueries'
import ChatThread from '@/components/gym/ChatThread'
import { useIsDesktop } from '@/hooks/useMediaQuery'

/** Lado coach: `/coach/alumno/:id/chat`. El coach soy yo; el alumno es `:id`. */
export function CoachChatWithClient() {
  const { id: clientId = '' } = useParams()
  const navigate = useNavigate()
  const coachId = useCurrentUserId()
  const isDesktop = useIsDesktop()
  const [name, setName] = useState('Alumno')

  useEffect(() => {
    let cancelled = false
    fetchMyClients()
      .then((clients) => {
        if (cancelled) return
        const c = clients.find((x) => x.clientId === clientId)
        if (c) setName(c.displayName || c.email)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [clientId])

  if (isDesktop) return <Navigate to={`/coach?alumno=${clientId}&chat=1`} replace />
  if (!coachId) return null
  return (
    <ChatThread
      coachId={coachId}
      clientId={clientId}
      title={name}
      onBack={() => navigate(`/coach/alumno/${clientId}`)}
    />
  )
}

/** Lado alumno: `/mi-coach/chat`. Resuelve el coach del vínculo activo. */
export function MyCoachChat() {
  const navigate = useNavigate()
  const clientId = useCurrentUserId()
  const [state, setState] = useState<
    { s: 'loading' } | { s: 'none' } | { s: 'error' } | { s: 'ok'; coachId: string; name: string }
  >({ s: 'loading' })
  const [retryTick, setRetryTick] = useState(0)

  useEffect(() => {
    if (!clientId) return
    let cancelled = false
    setState({ s: 'loading' })
    fetchMyCoach(clientId)
      .then((c) => {
        if (cancelled) return
        setState(c ? { s: 'ok', coachId: c.coachId, name: c.displayName || 'Tu coach' } : { s: 'none' })
      })
      .catch(() => {
        // Antes un error de red se mostraba igual que "no tenés coach" — un
        // alumno con coach de verdad veía "No tenés un coach vinculado" si
        // la consulta fallaba, en vez de un error con reintentar.
        if (!cancelled) setState({ s: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [clientId, retryTick])

  if (!clientId || state.s === 'loading') {
    return <p className="py-12 text-center text-sm text-ink-3">Cargando…</p>
  }
  if (state.s === 'error') {
    return (
      <div className="mx-auto max-w-sm px-6 py-16 text-center">
        <p className="text-[15px] text-ink-2">No se pudo cargar tu coach.</p>
        <button
          onClick={() => setRetryTick((n) => n + 1)}
          className="mt-4 h-11 rounded-sm bg-fill px-5 text-sm font-semibold text-ink-2"
        >
          Reintentar
        </button>
      </div>
    )
  }
  if (state.s === 'none') {
    return (
      <div className="mx-auto max-w-sm px-6 py-16 text-center">
        <p className="text-[15px] text-ink-2">No tenés un coach vinculado.</p>
        <button onClick={() => navigate('/perfil')} className="mt-4 h-11 rounded-sm bg-fill px-5 text-sm font-semibold text-ink-2">
          Volver
        </button>
      </div>
    )
  }
  return (
    <ChatThread
      coachId={state.coachId}
      clientId={clientId}
      title={state.name}
      onBack={() => navigate('/perfil')}
    />
  )
}
