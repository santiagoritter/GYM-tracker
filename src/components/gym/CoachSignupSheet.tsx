import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, X } from 'lucide-react'
import { becomeCoach } from '@/lib/coachSelfSignup'
import { COACH_TERMS_VERSION, useCoachBillingEnabled } from '@/lib/coachSubscription'
import { parseOptionalInt } from '@/lib/parseNumber'
import { toast } from '@/stores/toastStore'
import ResponsiveSheet from '@/components/ui/ResponsiveSheet'
import CoachDetailsFields, { type CoachDetails } from '@/components/gym/CoachDetailsFields'
import CoachPlanCard from '@/components/gym/CoachPlanCard'
import CoachSubscribeBlock from '@/components/gym/CoachSubscribeBlock'
import { useEntitlementsStore } from '@/stores/entitlementsStore'
import { cn } from '@/lib/utils'

type Step = 'details' | 'plan' | 'terms'
const STEPS: Step[] = ['details', 'plan', 'terms']
const TITLES: Record<Step, string> = {
  details: 'Tu ficha de coach',
  plan: 'Plan',
  terms: 'Términos para coaches',
}

const EMPTY: CoachDetails = {
  displayName: '',
  dni: '',
  experience: '',
  bio: '',
  specialties: [],
  location: '',
  certifications: '',
}

/**
 * Alta de coach en tres pasos (Ajustes → "Convertirme en coach"): 1) ficha con
 * datos que ayudan al alumno a elegir, 2) plan y precio, 3) términos para
 * coaches. Solo el último paso llama a `becomeCoach`. No se pide foto del DNI:
 * alcanza con el número, que solo ve el admin para verificar identidad.
 */
export default function CoachSignupSheet({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('details')
  const [details, setDetails] = useState<CoachDetails>(EMPTY)
  const [accepted, setAccepted] = useState(false)
  const [busy, setBusy] = useState(false)
  const stepIndex = STEPS.indexOf(step)
  const coachEntitled = useEntitlementsStore((s) => s.coach)
  // Con el cobro prendido, el alta se destraba recién con la suscripción activa.
  const needsSubscription = useCoachBillingEnabled() && !coachEntitled

  const validateDetails = (): string | null => {
    if (!details.displayName.trim()) return 'Falta el nombre público. Es el que van a ver tus alumnos.'
    const dniDigits = details.dni.replace(/\D/g, '')
    if (dniDigits.length < 7 || dniDigits.length > 9) return 'El DNI tiene que tener entre 7 y 9 dígitos.'
    return null
  }

  const next = () => {
    if (step === 'details') {
      const problem = validateDetails()
      if (problem) return toast.error('Revisá la ficha', problem)
      setStep('plan')
    } else if (step === 'plan') {
      if (needsSubscription) return toast.error('Falta la suscripción', 'Suscribite para activar el modo coach.')
      setStep('terms')
    }
  }

  const back = () => setStep(STEPS[Math.max(0, stepIndex - 1)])

  const submit = async () => {
    if (!accepted) return toast.error('Falta aceptar', 'Tenés que aceptar los términos para coaches.')
    setBusy(true)
    try {
      await becomeCoach({
        displayName: details.displayName.trim(),
        dni: details.dni,
        bio: details.bio.trim() || undefined,
        experienceYears: parseOptionalInt(details.experience),
        specialties: details.specialties,
        location: details.location.trim() || undefined,
        certifications: details.certifications.trim() || undefined,
        coachTermsVersion: COACH_TERMS_VERSION,
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
        <div className="flex min-w-0 items-center gap-2">
          {stepIndex > 0 && (
            <button
              onClick={back}
              disabled={busy}
              aria-label="Paso anterior"
              className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center text-ink-2"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold">{TITLES[step]}</h2>
            <p className="mt-0.5 text-[13px] text-ink-2">
              Paso {stepIndex + 1} de {STEPS.length}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-fill text-ink-2 active:bg-fill-2"
        >
          <X size={16} />
        </button>
      </div>

      <div className="mx-5 mb-2 flex gap-1.5" aria-hidden>
        {STEPS.map((s, i) => (
          <div key={s} className={cn('h-1 flex-1 rounded-full', i <= stepIndex ? 'bg-accent' : 'bg-fill')} />
        ))}
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-2 pt-2">
        {step === 'details' && <CoachDetailsFields value={details} onChange={setDetails} />}

        {step === 'plan' && (
          <>
            <CoachPlanCard />
            <CoachSubscribeBlock />
            <p className="text-[13px] leading-relaxed text-ink-3">
              Podés salir del modo coach cuando quieras desde Plan Coach; se terminan los
              vínculos con tus alumnos.
            </p>
          </>
        )}

        {step === 'terms' && (
          <>
            <ul className="space-y-2.5 text-[14px] leading-relaxed text-ink-2">
              <li>• Sos un usuario independiente: Repe no te emplea ni garantiza tus servicios.</li>
              <li>• Tenés al menos 18 años y los datos que cargás son verdaderos.</li>
              <li>
                • Tratás la información de tus alumnos con confidencialidad y solo para
                entrenarlos. Cuando un alumno corta el vínculo, perdés el acceso.
              </li>
              <li>
                • Tu DNI se usa solo para verificar tu identidad y evitar cuentas duplicadas; no se
                muestra a nadie. El sello de verificado no acredita títulos.
              </li>
              <li>
                • Respetás las reglas de conducta: sin acoso, spam ni contenido inapropiado. Los
                reportes se revisan y pueden suspender tu cuenta.
              </li>
            </ul>
            <label className="flex min-h-11 items-start gap-3 text-[14px] text-ink-2">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-1 h-5 w-5 shrink-0 accent-[rgb(var(--color-accent))]"
              />
              <span>
                Acepto los términos para coaches y los{' '}
                <Link to="/legal/terminos" className="font-semibold text-accent">
                  términos de uso
                </Link>
                .
              </span>
            </label>
          </>
        )}
      </div>

      <div className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2">
        {step === 'terms' ? (
          <button
            onClick={submit}
            disabled={busy || !accepted}
            className="h-12 w-full rounded-sm bg-accent text-sm font-bold text-bg disabled:opacity-50"
          >
            {busy ? 'Activando…' : 'Convertirme en coach'}
          </button>
        ) : (
          <button
            onClick={next}
            disabled={step === 'plan' && needsSubscription}
            className="h-12 w-full rounded-sm bg-accent text-sm font-bold text-bg disabled:opacity-40"
          >
            Continuar
          </button>
        )}
      </div>
    </ResponsiveSheet>
  )
}
