import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronRight, Flag, Star } from 'lucide-react'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { fetchMyCoachProfile } from '@/lib/coachQueries'
import { saveCoachProfile } from '@/lib/coachMutations'
import { fetchMyDni, saveDni } from '@/lib/coachIdentity'
import { fetchCoachReviews, type CoachRatingSummary } from '@/lib/coachReviews'
import { toast } from '@/stores/toastStore'
import { Card, Row } from '@/components/ui/Card'
import VerifiedBadge from '@/components/gym/VerifiedBadge'
import ReportSheet from '@/components/gym/ReportSheet'
import CoachDetailsFields, { type CoachDetails } from '@/components/gym/CoachDetailsFields'
import { parseOptionalInt } from '@/lib/parseNumber'

/**
 * Ficha de coach: la primera vez actúa de onboarding (nombre + DNI + bio +
 * experiencia). El DNI es obligatorio y único por cuenta — habilita el
 * cotejo de verificación, que sigue haciéndolo el admin.
 */
export default function CoachProfile() {
  const navigate = useNavigate()
  const userId = useCurrentUserId()
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [retryTick, setRetryTick] = useState(0)
  const [details, setDetails] = useState<CoachDetails>({
    displayName: '',
    dni: '',
    experience: '',
    bio: '',
    specialties: [],
    location: '',
    certifications: '',
  })
  const [dni, setDni] = useState('')
  const [verified, setVerified] = useState(false)
  const [busy, setBusy] = useState(false)
  const [isNew, setIsNew] = useState(true)
  const [reviews, setReviews] = useState<CoachRatingSummary | null>(null)
  const [reportReview, setReportReview] = useState<{ id: string; clientId: string } | null>(null)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    setLoaded(false)
    setLoadError(false)
    Promise.all([fetchMyCoachProfile(userId), fetchMyDni()])
      .then(([p, savedDni]) => {
        if (cancelled) return
        if (p) {
          setDetails({
            displayName: p.displayName,
            dni: '',
            experience: p.experienceYears != null ? String(p.experienceYears) : '',
            bio: p.bio,
            specialties: p.specialties,
            location: p.location,
            certifications: p.certifications,
          })
          setVerified(p.verified)
          setIsNew(false)
          fetchCoachReviews(userId).then(setReviews).catch(() => {})
        }
        if (savedDni) setDni(savedDni)
      })
      .catch(() => {
        // Antes esto no tenía catch: un error de red dejaba la pantalla en
        // "Cargando…" para siempre (`setLoaded(true)` nunca llegaba a
        // correr). Ahora se distingue de "coach nuevo" — ver el fix de
        // `fetchMyCoachProfile` en coachQueries.ts, que antes también
        // confundía un fallo de red con "no hay fila".
        if (!cancelled) setLoadError(true)
      })
      .finally(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [userId, retryTick])

  const save = async () => {
    if (!details.displayName.trim()) {
      toast.error('Falta el nombre', 'Es el que van a ver tus alumnos.')
      return
    }
    if (dni.replace(/\D/g, '').length < 7) {
      toast.error('Falta el DNI', 'Es obligatorio y único por cuenta de coach.')
      return
    }
    setBusy(true)
    try {
      await saveDni(dni)
      await saveCoachProfile({
        displayName: details.displayName,
        bio: details.bio,
        experienceYears: parseOptionalInt(details.experience),
        specialties: details.specialties,
        location: details.location,
        certifications: details.certifications,
      })
      toast.success(isNew ? 'Perfil de coach creado' : 'Perfil actualizado')
      setIsNew(false)
      if (isNew) navigate('/coach')
    } catch (e) {
      toast.error('No se pudo guardar', e instanceof Error ? e.message : 'Error')
    } finally {
      setBusy(false)
    }
  }

  if (!loaded) return <p className="py-12 text-center text-sm text-ink-3">Cargando…</p>

  if (loadError) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
        <p className="text-sm text-ink-3">No se pudo cargar tu perfil de coach.</p>
        <button
          onClick={() => setRetryTick((n) => n + 1)}
          className="h-11 rounded-sm bg-surface px-4 text-sm font-semibold text-ink-2 active:opacity-70"
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto min-h-screen lg:min-h-0 content-width pb-24">
      <header className="glass sticky top-[var(--app-header-h,0px)] z-20 flex items-center gap-3 border-b border-line px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <button onClick={() => navigate('/coach')} aria-label="Volver" className="flex h-11 w-11 items-center justify-center text-ink-2">
          <ArrowLeft size={22} />
        </button>
        <h1 className="font-semibold">{isNew ? 'Perfil de coach' : 'Editar perfil'}</h1>
      </header>

      <div className="space-y-4 px-4 py-4">
        {isNew && (
          <p className="rounded-md bg-info/5 p-3 text-[14px] leading-relaxed text-ink-2">
            Completá tu ficha para empezar a tomar alumnos. El nombre y la bio los ven antes
            de aceptar el vínculo; el DNI no se muestra nunca, solo sirve para verificar tu
            identidad y que no haya cuentas duplicadas.
          </p>
        )}
        {!isNew && (
          <p className="flex items-center gap-1.5 text-[14px] text-ink-2">
            {verified ? (
              <>
                <VerifiedBadge /> Cuenta verificada
              </>
            ) : (
              'Sin verificar todavía — lo aprueba un administrador.'
            )}
          </p>
        )}

        <CoachDetailsFields value={details} onChange={setDetails} showDni={false} />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-2">DNI (privado)</label>
          <input
            inputMode="numeric"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
            maxLength={12}
            placeholder="Sin puntos"
            className="h-12 w-full rounded-sm bg-surface px-4 text-[15px] tabular-nums outline-none ring-1 ring-line-2 focus:ring-accent"
          />
          {!isNew && (
            <p className="mt-1 text-[12px] text-ink-3">
              Si cambiás el nombre, la bio o el DNI, la verificación vuelve a quedar pendiente.
            </p>
          )}
        </div>

        <button
          onClick={save}
          disabled={busy}
          className="h-12 w-full rounded-sm bg-accent text-sm font-bold text-bg disabled:opacity-50"
        >
          {busy ? 'Guardando…' : isNew ? 'Crear perfil' : 'Guardar'}
        </button>

        {!isNew && (
          <>
            <Card>
              <Row onClick={() => navigate('/coach/plan')}>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px]">Plan Coach</p>
                  <p className="text-[13px] text-ink-3">Gratis por ahora</p>
                </div>
                <ChevronRight size={16} className="shrink-0 text-ink-4" />
              </Row>
            </Card>

            {reviews && reviews.count > 0 && (
              <section>
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-2">
                  <Star size={15} className="text-warning" fill="currentColor" />
                  {reviews.average?.toFixed(1)} · {reviews.count} reseña{reviews.count === 1 ? '' : 's'}
                </p>
                <Card>
                  {reviews.reviews.slice(0, 10).map((r) => (
                    <Row key={r.id} className="items-start gap-2">
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <span className="flex text-warning">
                          {Array.from({ length: r.rating }).map((_, i) => (
                            <Star key={i} size={13} fill="currentColor" />
                          ))}
                        </span>
                        {r.comment && <p className="text-[14px] text-ink-2">{r.comment}</p>}
                      </div>
                      <button
                        onClick={() => setReportReview({ id: r.id, clientId: r.clientId })}
                        aria-label="Reportar reseña"
                        className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center text-ink-4"
                      >
                        <Flag size={15} />
                      </button>
                    </Row>
                  ))}
                </Card>
              </section>
            )}
          </>
        )}
      </div>
      {reportReview && (
        <ReportSheet
          targetUserId={reportReview.clientId}
          targetName="quien escribió la reseña"
          kind="review"
          targetRef={reportReview.id}
          onClose={() => setReportReview(null)}
          onBlocked={() => userId && fetchCoachReviews(userId).then(setReviews).catch(() => {})}
        />
      )}
    </div>
  )
}
