import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import ClientDetailPanel from '@/components/gym/ClientDetailPanel'
import { useIsDesktop } from '@/hooks/useMediaQuery'

/**
 * Detalle de un alumno en pantalla completa (mobile). Todo el contenido vive en
 * `ClientDetailPanel`, que también se monta como panel derecho en desktop.
 */
export default function CoachClientDetail() {
  const { id: clientId = '' } = useParams()
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()

  // En desktop el detalle vive en el master-detail de /coach (mismo contenido,
  // sin salir de la lista): un enlace directo o una recarga acá redirige allá.
  if (isDesktop) return <Navigate to={`/coach?alumno=${clientId}`} replace />

  return (
    <div className="mx-auto min-h-screen content-width pb-24 lg:max-w-4xl">
      <header className="glass sticky top-0 z-30 flex items-center gap-3 border-b border-line px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <button
          onClick={() => navigate('/coach')}
          aria-label="Volver"
          className="flex h-11 w-11 items-center justify-center text-ink-2"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="font-semibold">Alumno</h1>
      </header>

      <div className="px-4 py-4">
        <ClientDetailPanel
          clientId={clientId}
          onOpenChat={() => navigate(`/coach/alumno/${clientId}/chat`)}
          onEnded={() => navigate('/coach')}
        />
      </div>
    </div>
  )
}
