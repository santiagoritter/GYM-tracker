import { COACH_SPECIALTIES, MAX_SPECIALTIES } from '@/lib/coachSpecialties'
import { cn } from '@/lib/utils'

export interface CoachDetails {
  displayName: string
  dni: string
  experience: string
  bio: string
  specialties: string[]
  location: string
  certifications: string
}

const FIELD =
  'w-full rounded-sm bg-surface-2 px-4 text-[15px] outline-none focus:ring-1 focus:ring-accent'

/**
 * Campos de la ficha de coach, compartidos por el alta (wizard, paso 1) y la
 * edición del perfil. El DNI se pide solo en el alta (`showDni`): en la edición
 * vive en su propio bloque para que cambiarlo sea una decisión consciente
 * (invalida la verificación).
 */
export default function CoachDetailsFields({
  value,
  onChange,
  showDni = true,
}: {
  value: CoachDetails
  onChange: (next: CoachDetails) => void
  showDni?: boolean
}) {
  const set = <K extends keyof CoachDetails>(key: K, v: CoachDetails[K]) =>
    onChange({ ...value, [key]: v })

  const toggleSpecialty = (name: string) => {
    const has = value.specialties.includes(name)
    if (!has && value.specialties.length >= MAX_SPECIALTIES) return
    set('specialties', has ? value.specialties.filter((s) => s !== name) : [...value.specialties, name])
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink-2">Nombre público</label>
        <input
          value={value.displayName}
          onChange={(e) => set('displayName', e.target.value)}
          maxLength={80}
          placeholder="Cómo te van a ver tus alumnos"
          className={cn(FIELD, 'h-12')}
        />
      </div>

      {showDni && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-2">DNI (privado)</label>
          <input
            inputMode="numeric"
            value={value.dni}
            onChange={(e) => set('dni', e.target.value)}
            maxLength={12}
            placeholder="Sin puntos"
            className={cn(FIELD, 'h-12 tabular-nums')}
          />
          <p className="mt-1 text-[12px] text-ink-3">
            No se muestra nunca. Sirve para verificar tu identidad y evitar cuentas duplicadas.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-2">Años de experiencia</label>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={80}
            value={value.experience}
            onChange={(e) => set('experience', e.target.value)}
            className={cn(FIELD, 'h-12')}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-2">Ciudad / país</label>
          <input
            value={value.location}
            onChange={(e) => set('location', e.target.value)}
            maxLength={80}
            placeholder="Ej: Rosario, AR"
            className={cn(FIELD, 'h-12')}
          />
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-sm font-medium text-ink-2">
          Especialidades <span className="font-normal text-ink-3">(hasta {MAX_SPECIALTIES})</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {COACH_SPECIALTIES.map((name) => {
            const on = value.specialties.includes(name)
            return (
              <button
                key={name}
                type="button"
                onClick={() => toggleSpecialty(name)}
                aria-pressed={on}
                className={cn(
                  'h-11 rounded-full px-4 text-[14px] font-medium transition-colors',
                  on ? 'bg-accent text-bg' : 'bg-fill text-ink-2 active:bg-fill-2'
                )}
              >
                {name}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink-2">Certificaciones y formación</label>
        <textarea
          value={value.certifications}
          onChange={(e) => set('certifications', e.target.value)}
          rows={2}
          maxLength={400}
          placeholder="Títulos, cursos, certificaciones (opcional)"
          className={cn(FIELD, 'p-4')}
        />
        <p className="mt-1 text-[12px] text-ink-3">
          Lo ven tus alumnos. El sello de verificado no acredita títulos: solo identidad.
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink-2">Bio</label>
        <textarea
          value={value.bio}
          onChange={(e) => set('bio', e.target.value)}
          rows={3}
          maxLength={600}
          placeholder="Método, a quién entrenás…"
          className={cn(FIELD, 'p-4')}
        />
      </div>
    </div>
  )
}
