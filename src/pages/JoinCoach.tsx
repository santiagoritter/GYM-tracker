import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Star, UserCheck } from 'lucide-react'
import { fetchInvitePreview, type CoachPublic } from '@/lib/coachQueries'
import { fetchCoachReviews } from '@/lib/coachReviews'
import { acceptInvite } from '@/lib/coachMutations'
import { toast } from '@/stores/toastStore'
import VerifiedBadge from '@/components/gym/VerifiedBadge'

/**
 * `/unirse/:code` — el alumno abre el link/QR del coach, ve una
 * previsualización y acepta el vínculo. Requiere estar logueado (está
 * dentro de las rutas protegidas).
 */
export default function JoinCoach() {
  const { code = '' } = useParams()
  const navigate = useNavigate()
  const [state, setState] = useState<
    { s: 'loading' } | { s: 'invalid' } | { s: 'ok'; coach: CoachPublic }
  >({ s: 'loading' })
  const [rating, setRating] = useState<{ average: number | null; count: number }>({ average: null, count: 0 })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetchInvitePreview(code)
      .then((coach) => {
        if (!coach) return setState({ s: 'invalid' })
        setState({ s: 'ok', coach })
        fetchCoachReviews(coach.coachId)
          .then((r) => setRating({ average: r.average, count: r.count }))
          .catch(() => {})
      })
      .catch(() => setState({ s: 'invalid' }))
  }, [code])

  const accept = async () => {
    setBusy(true)
    try {
      await acceptInvite(code)
      toast.success('Vínculo aceptado', 'Tu coach ya puede ver tu progreso.')
      navigate('/perfil', { replace: true })
    } catch (e) {
      toast.error('No se pudo aceptar', e instanceof Error ? e.message : 'Error')
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-5 px-6 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      {state.s === 'loading' ? (
        <p className="text-center text-sm text-ink-3">Cargando…</p>
      ) : state.s === 'invalid' ? (
        <>
          <h1 className="text-2xl font-bold">Invitación no válida</h1>
          <p className="text-[15px] text-ink-2">El enlace venció o no existe. Pedile a tu coach uno nuevo.</p>
          <button onClick={() => navigate('/')} className="h-12 rounded-sm border border-line-2 text-sm font-semibold text-ink-2">
            Volver
          </button>
        </>
      ) : (
        <>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15">
            <UserCheck size={26} className="text-accent" />
          </div>
          <div className="space-y-1">
            <p className="text-[13px] text-ink-3">Te invitó a ser tu coach</p>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              {state.coach.displayName || 'Un coach'}
              {state.coach.verified && <VerifiedBadge size={20} />}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 text-[14px] text-ink-3">
              {state.coach.experienceYears != null && (
                <span>{state.coach.experienceYears} años de experiencia</span>
              )}
              {rating.average != null && (
                <span className="flex items-center gap-1">
                  <Star size={14} className="text-warning" fill="currentColor" />
                  {rating.average.toFixed(1)} ({rating.count})
                </span>
              )}
            </div>
          </div>
          {state.coach.bio && (
            <p className="text-[15px] leading-relaxed text-ink-2">{state.coach.bio}</p>
          )}
          <p className="text-[13px] leading-relaxed text-ink-3">
            Al aceptar, tu coach va a poder ver tus entrenamientos, PRs y medidas, y
            asignarte rutinas y metas. Podés cortar el vínculo cuando quieras desde tu perfil.
          </p>
          <div className="space-y-2">
            <button
              onClick={accept}
              disabled={busy}
              className="h-12 w-full rounded-sm bg-accent text-sm font-bold text-bg disabled:opacity-50"
            >
              {busy ? 'Aceptando…' : 'Aceptar'}
            </button>
            <button onClick={() => navigate('/')} className="h-11 w-full text-[13px] font-medium text-ink-3">
              Ahora no
            </button>
          </div>
        </>
      )}
    </div>
  )
}
