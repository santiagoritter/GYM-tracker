import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Copy, MessageCircle, Star, UserCheck } from 'lucide-react'
import { fetchInvitePreview, type CoachPublic } from '@/lib/coachQueries'
import { fetchCoachReviews } from '@/lib/coachReviews'
import { acceptInvite } from '@/lib/coachMutations'
import {
  classifyAcceptError,
  guardianLink,
  guardianWhatsappUrl,
  requestGuardianConsent,
  type AcceptBlock,
} from '@/lib/guardianConsent'
import { runSync } from '@/lib/sync'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { toast } from '@/stores/toastStore'
import { useAuthStore } from '@/stores/authStore'
import VerifiedBadge from '@/components/gym/VerifiedBadge'

/**
 * `/unirse/:code` — el alumno abre el link/QR del coach, ve una
 * previsualización y acepta el vínculo. Requiere estar logueado (está
 * dentro de las rutas protegidas).
 */
export default function JoinCoach() {
  const { code = '' } = useParams()
  const navigate = useNavigate()
  const isGuest = useAuthStore((s) => s.isGuest)
  const [state, setState] = useState<
    { s: 'loading' } | { s: 'invalid' } | { s: 'offline' } | { s: 'ok'; coach: CoachPublic }
  >({ s: 'loading' })
  const [rating, setRating] = useState<{ average: number | null; count: number }>({ average: null, count: 0 })
  const [busy, setBusy] = useState(false)
  const userId = useCurrentUserId()
  // Reglas de menores (migración 0028): qué falta para poder aceptar y el enlace
  // para el tutor, una vez generado.
  const [block, setBlock] = useState<AcceptBlock>(null)
  const [link, setLink] = useState<string | null>(null)

  useEffect(() => {
    if (isGuest) return
    fetchInvitePreview(code)
      .then((coach) => {
        if (!coach) return setState({ s: 'invalid' })
        setState({ s: 'ok', coach })
        fetchCoachReviews(coach.coachId)
          .then((r) => setRating({ average: r.average, count: r.count }))
          .catch(() => {})
      })
      // Sin señal no es lo mismo que un link vencido: no mandar al usuario a
      // pedirle otro link a su coach por un problema de conexión.
      .catch(() => setState({ s: navigator.onLine ? 'invalid' : 'offline' }))
  }, [code, isGuest])

  const accept = async () => {
    setBusy(true)
    try {
      // El servidor decide si sos menor por la fecha de nacimiento sincronizada:
      // se sube antes de aceptar para no tratar como menor a un adulto cuyo
      // perfil todavía no llegó.
      if (userId) await runSync(userId).catch(() => undefined)
      await acceptInvite(code)
      toast.success('Vínculo aceptado', 'Tu coach ya puede ver tu progreso.')
      navigate('/perfil', { replace: true })
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error'
      const blocked = classifyAcceptError(message)
      if (blocked) setBlock(blocked)
      else toast.error('No se pudo aceptar', message)
    } finally {
      setBusy(false)
    }
  }

  const makeLink = async () => {
    setBusy(true)
    try {
      setLink(guardianLink(await requestGuardianConsent(code)))
    } catch (e) {
      toast.error('No se pudo generar el enlace', e instanceof Error ? e.message : 'Error')
    } finally {
      setBusy(false)
    }
  }

  const copyLink = async () => {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      toast.success('Enlace copiado')
    } catch {
      toast.error('No se pudo copiar', 'Mantené apretado el enlace para copiarlo.')
    }
  }

  if (isGuest) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-5 px-6 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
        <h1 className="text-2xl font-bold">Necesitás una cuenta</h1>
        <p className="text-[15px] leading-relaxed text-ink-2">
          Para vincularte con un coach hace falta una cuenta: es lo que le permite ver tu progreso con tu permiso. Creala
          y volvé a abrir este enlace; tus datos actuales pasan a tu cuenta.
        </p>
        <div className="space-y-2">
          <button onClick={() => navigate('/registro')} className="h-12 w-full rounded-sm bg-accent text-sm font-bold text-bg">
            Crear cuenta
          </button>
          <button onClick={() => navigate('/')} className="h-11 w-full text-[13px] font-medium text-ink-3">
            Ahora no
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-5 px-6 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      {state.s === 'loading' ? (
        <p className="text-center text-sm text-ink-3">Cargando…</p>
      ) : state.s === 'invalid' || state.s === 'offline' ? (
        <>
          <h1 className="text-2xl font-bold">
            {state.s === 'offline' ? 'Sin conexión' : 'Invitación no válida'}
          </h1>
          <p className="text-[15px] text-ink-2">
            {state.s === 'offline'
              ? 'No pudimos abrir la invitación porque no hay internet. Conectate y volvé a abrir el link.'
              : 'El enlace venció o no existe. Pedile a tu coach uno nuevo.'}
          </p>
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
          {state.coach.location && <p className="text-[14px] text-ink-3">{state.coach.location}</p>}
          {state.coach.specialties.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {state.coach.specialties.map((sp) => (
                <span key={sp} className="rounded-full bg-fill px-3 py-1 text-[13px] text-ink-2">
                  {sp}
                </span>
              ))}
            </div>
          )}
          {state.coach.bio && (
            <p className="text-[15px] leading-relaxed text-ink-2">{state.coach.bio}</p>
          )}
          {state.coach.certifications && (
            <p className="text-[13px] leading-relaxed text-ink-3">
              Formación: {state.coach.certifications}
            </p>
          )}
          <p className="text-[13px] leading-relaxed text-ink-3">
            Al aceptar, tu coach va a poder ver tu progreso (entrenamientos, récords, medidas,
            niveles y tu ficha física) y asignarte rutinas y metas. Tus calorías solo las ve si
            vos lo habilitás; las fotos de progreso nunca se comparten. Podés cortar el vínculo
            cuando quieras desde tu perfil.
          </p>
          {block === 'unverified' ? (
            <div className="space-y-3 rounded-md bg-surface p-4">
              <p className="text-[15px] font-semibold">Este entrenador todavía no está verificado</p>
              <p className="text-[14px] leading-relaxed text-ink-2">
                Para menores de 18 solo se puede entrenar con entrenadores verificados. Pedile a tu entrenador que
                complete la verificación y volvé a abrir el enlace.
              </p>
              <button onClick={() => navigate('/')} className="h-11 w-full text-[13px] font-medium text-ink-3">
                Volver
              </button>
            </div>
          ) : block === 'consent' ? (
            <div className="space-y-3 rounded-md bg-surface p-4">
              <p className="text-[15px] font-semibold">Necesitamos el permiso de tu mamá, papá o tutor</p>
              <p className="text-[14px] leading-relaxed text-ink-2">
                Como sos menor de 18, tu madre, padre o tutor tiene que autorizar este vínculo. Generá un enlace y
                mandáselo: lo abre sin cuenta y confirma.
              </p>
              {link ? (
                <div className="space-y-2">
                  <a
                    href={guardianWhatsappUrl(link, state.coach.displayName ?? '')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-sm bg-accent text-sm font-bold text-bg"
                  >
                    <MessageCircle size={18} /> Enviar por WhatsApp
                  </a>
                  <button
                    onClick={copyLink}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-sm bg-fill text-sm font-semibold text-ink"
                  >
                    <Copy size={16} /> Copiar enlace
                  </button>
                  <button
                    onClick={accept}
                    disabled={busy}
                    className="h-11 w-full text-[13px] font-semibold text-accent disabled:opacity-50"
                  >
                    {busy ? 'Revisando…' : 'Ya lo autorizaron: continuar'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={makeLink}
                  disabled={busy}
                  className="h-12 w-full rounded-sm bg-accent text-sm font-bold text-bg disabled:opacity-50"
                >
                  {busy ? 'Generando…' : 'Generar enlace para mi tutor'}
                </button>
              )}
            </div>
          ) : (
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
          )}
        </>
      )}
    </div>
  )
}
