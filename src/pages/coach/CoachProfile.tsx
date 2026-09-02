import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { fetchMyCoachProfile } from '@/lib/coachQueries'
import { saveCoachProfile } from '@/lib/coachMutations'
import { toast } from '@/stores/toastStore'
import VerifiedBadge from '@/components/gym/VerifiedBadge'

/**
 * Ficha de coach: la primera vez actúa de onboarding (nombre + bio +
 * experiencia). El verificado amarillo lo pone SOLO el admin (0012_coach.sql),
 * acá solo se muestra el estado.
 */
export default function CoachProfile() {
  const navigate = useNavigate()
  const userId = useCurrentUserId()
  const [loaded, setLoaded] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [experience, setExperience] = useState('')
  const [verified, setVerified] = useState(false)
  const [busy, setBusy] = useState(false)
  const [isNew, setIsNew] = useState(true)

  useEffect(() => {
    if (!userId) return
    fetchMyCoachProfile(userId).then((p) => {
      if (p) {
        setDisplayName(p.displayName)
        setBio(p.bio)
        setExperience(p.experienceYears != null ? String(p.experienceYears) : '')
        setVerified(p.verified)
        setIsNew(false)
      }
      setLoaded(true)
    })
  }, [userId])

  const save = async () => {
    if (!displayName.trim()) {
      toast.error('Falta el nombre', 'Es el que van a ver tus alumnos.')
      return
    }
    setBusy(true)
    try {
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
            Completá tu ficha para empezar a tomar alumnos. Es lo que van a ver antes de
            aceptar el vínculo.
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
      </div>
    </div>
  )
}
