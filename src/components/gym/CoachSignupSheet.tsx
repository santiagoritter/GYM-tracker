import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { becomeCoach } from '@/lib/coachSelfSignup'
import { toast } from '@/stores/toastStore'
import ResponsiveSheet from '@/components/ui/ResponsiveSheet'

/**
 * Formulario de alta de coach (Ajustes → "Convertirme en coach"). Pide los
 * datos y llama a `becomeCoach`. El verificado amarillo lo da un admin
 * después de cotejar el DNI — acá solo se anota.
 */
export default function CoachSignupSheet({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [dni, setDni] = useState('')
  const [experience, setExperience] = useState('')
  const [bio, setBio] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!displayName.trim()) return toast.error('Falta el nombre', 'Es el que van a ver tus alumnos.')
    if (dni.replace(/\D/g, '').length < 7) return toast.error('Falta el DNI', 'Único por cuenta de coach.')
    setBusy(true)
    try {
      await becomeCoach({
        displayName: displayName.trim(),
        dni,
        bio: bio.trim() || undefined,
        experienceYears: experience.trim() ? Number(experience) : null,
      })
      toast.success('¡Ya sos coach!', 'Generá una invitación para tomar tu primer alumno.')
      onClose()
      navigate('/coach')
    } catch (e) {
      toast.error('No se pudo', e instanceof Error ? e.message : 'Error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ResponsiveSheet onClose={onClose} panelClassName="flex max-h-[88vh] flex-col">
      <div className="flex items-start justify-between px-5 pt-4 pb-2">
        <div>
          <h2 className="text-lg font-bold">Convertirme en coach</h2>
          <p className="mt-0.5 text-[13px] text-ink-2">Para tomar alumnos y seguir su progreso</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-fill text-ink-2 active:bg-fill-2"
        >
          <X size={16} />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-2">Nombre público</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Cómo te van a ver tus alumnos"
            className="h-12 w-full rounded-sm bg-surface-2 px-4 text-[15px] outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-2">DNI (privado)</label>
          <input
            inputMode="numeric"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
            placeholder="Sin puntos"
            className="h-12 w-full rounded-sm bg-surface-2 px-4 text-[15px] tabular-nums outline-none focus:ring-1 focus:ring-accent"
          />
          <p className="mt-1 text-[12px] text-ink-3">
            No se muestra nunca. Sirve para verificar tu identidad y evitar cuentas duplicadas.
          </p>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-2">Años de experiencia</label>
          <input
            type="number"
            inputMode="numeric"
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            className="h-12 w-full rounded-sm bg-surface-2 px-4 text-[15px] outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-2">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="Especialidad, método, a quién entrenás…"
            className="w-full rounded-sm bg-surface-2 p-4 text-[15px] outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>

      <div className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2">
        <button
          onClick={submit}
          disabled={busy}
          className="h-12 w-full rounded-sm bg-accent text-sm font-bold text-bg disabled:opacity-50"
        >
          {busy ? 'Activando…' : 'Convertirme en coach'}
        </button>
      </div>
    </ResponsiveSheet>
  )
}
