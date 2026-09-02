import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronRight, Star } from 'lucide-react'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { fetchMyCoachProfile } from '@/lib/coachQueries'
import { saveCoachProfile } from '@/lib/coachMutations'
import { fetchMyDni, saveDni } from '@/lib/coachIdentity'
import { fetchCoachReviews, type CoachRatingSummary } from '@/lib/coachReviews'
import { toast } from '@/stores/toastStore'
import { Card, Row } from '@/components/ui/Card'
import VerifiedBadge from '@/components/gym/VerifiedBadge'

/**
 * Ficha de coach: la primera vez actúa de onboarding (nombre + DNI + bio +
 * experiencia). El DNI es obligatorio y único por cuenta — habilita el
 * cotejo de verificación, que sigue haciéndolo el admin.
 */
export default function CoachProfile() {
  const navigate = useNavigate()
  const userId = useCurrentUserId()
  const [loaded, setLoaded] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [dni, setDni] = useState('')
  const [bio, setBio] = useState('')
  const [experience, setExperience] = useState('')
  const [verified, setVerified] = useState(false)
  const [busy, setBusy] = useState(false)
  const [isNew, setIsNew] = useState(true)
  const [reviews, setReviews] = useState<CoachRatingSummary | null>(null)

  useEffect(() => {
    if (!userId) return
    Promise.all([fetchMyCoachProfile(userId), fetchMyDni()]).then(([p, savedDni]) => {
      if (p) {
        setDisplayName(p.displayName)
        setBio(p.bio)
        setExperience(p.experienceYears != null ? String(p.experienceYears) : '')
        setVerified(p.verified)
        setIsNew(false)
        fetchCoachReviews(userId).then(setReviews).catch(() => {})
      }
      if (savedDni) setDni(savedDni)
      setLoaded(true)
    })
  }, [userId])

  const save = async () => {
    if (!displayName.trim()) {
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
        displayName,
        bio,
        experienceYears: experience.trim() ? Number(experience) : null,
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

  return (
    <div className="mx-auto min-h-screen content-width pb-24">
      <header className="glass sticky top-0 z-30 flex items-center gap-3 border-b border-line px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
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

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-2">Nombre público</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Cómo te van a ver tus alumnos"
            className="h-12 w-full rounded-sm bg-surface px-4 text-[15px] outline-none ring-1 ring-line-2 focus:ring-accent"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-2">DNI (privado)</label>
          <input
            inputMode="numeric"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
            placeholder="Sin puntos"
            className="h-12 w-full rounded-sm bg-surface px-4 text-[15px] tabular-nums outline-none ring-1 ring-line-2 focus:ring-accent"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-2">Años de experiencia</label>
          <input
            type="number"
            inputMode="numeric"
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            className="h-12 w-full rounded-sm bg-surface px-4 text-[15px] outline-none ring-1 ring-line-2 focus:ring-accent"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-2">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            placeholder="Especialidad, método, a quién entrenás…"
            className="w-full rounded-sm bg-surface p-4 text-[15px] outline-none ring-1 ring-line-2 focus:ring-accent"
          />
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
                    <Row key={r.id} className="flex-col items-stretch gap-0.5">
                      <span className="flex text-warning">
                        {Array.from({ length: r.rating }).map((_, i) => (
                          <Star key={i} size={13} fill="currentColor" />
                        ))}
                      </span>
                      {r.comment && <p className="text-[14px] text-ink-2">{r.comment}</p>}
                    </Row>
                  ))}
                </Card>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
