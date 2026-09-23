import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Scale, Target, TrendingUp, Trophy, User, WifiOff, type LucideIcon } from 'lucide-react'
import RepeMark from '@/components/ui/RepeMark'
import { db } from '@/db/schema'
import { runSync } from '@/lib/sync'
import { useAuthStore } from '@/stores/authStore'
import { ONBOARDING_MESSAGES, getRandomMessage } from '@/lib/motivational'
import { GOAL_OPTIONS as GOALS, LEVEL_OPTIONS as LEVELS } from '@/lib/strengthStandards'
import { cn, nowIso } from '@/lib/utils'
import { toast } from '@/stores/toastStore'
import type { FitnessGoal, ExperienceLevel } from '@/types'

const WELCOME_HIGHLIGHTS: { text: string; Icon: LucideIcon }[] = [
  { text: 'Funciona sin conexión: entrená aunque el gimnasio no tenga señal', Icon: WifiOff },
  { text: 'Te sugiere el peso de cada serie según tu historial', Icon: Scale },
  { text: 'Seguí tu progreso con niveles de fuerza y récords personales', Icon: TrendingUp },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const userId = useAuthStore((s) => s.userId)
  const name = useAuthStore((s) => s.name)
  const role = useAuthStore((s) => s.role)
  const [step, setStep] = useState(0)
  const [quote] = useState(() => getRandomMessage(ONBOARDING_MESSAGES))

  // Form state
  const [sex, setSex] = useState<'male' | 'female' | ''>('')
  const [dob, setDob] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [goal, setGoal] = useState<FitnessGoal | ''>('')
  const [level, setLevel] = useState<ExperienceLevel | ''>('')
  const [saving, setSaving] = useState(false)

  // Red de seguridad, no la corrección principal (esa es la carrera
  // onboarding-vs-sync arreglada en Login.tsx/ForgotPassword.tsx): si por
  // lo que sea se llega acá con datos reales ya en Dexie, el formulario no
  // debería arrancar en blanco y pedirle a la persona que los vuelva a
  // tipear.
  useEffect(() => {
    if (!userId) return
    db.profile
      .get(userId)
      .then((profile) => {
        if (!profile) return
        if (profile.sex) setSex(profile.sex)
        if (profile.dob) setDob(profile.dob)
        if (profile.bodyWeightKg) setWeightKg(String(profile.bodyWeightKg))
        if (profile.heightCm) setHeightCm(String(profile.heightCm))
        if (profile.goal) setGoal(profile.goal)
        if (profile.level) setLevel(profile.level)
      })
      .catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const TOTAL_STEPS = 4

  const handleFinish = async () => {
    if (!userId) return
    setSaving(true)
    try {
      const profile = await db.profile.get(userId)
      const patch = {
        ...(sex && { sex }),
        ...(dob && { dob }),
        ...(weightKg && { bodyWeightKg: Number(weightKg) }),
        ...(heightCm && { heightCm: Number(heightCm) }),
        ...(goal && { goal }),
        ...(level && { level }),
      }
      // onboardingComplete vive en el perfil, no en `users`: la tabla local
      // de usuarios desaparece al migrar a Supabase Auth, y el perfil es lo
      // que se sincroniza a la nube.
      if (profile) {
        await db.profile.update(userId, { ...patch, onboardingComplete: 1 })
      } else {
        await db.profile.add({
          id: userId,
          units: 'kg',
          restTimerDefault: 90,
          onboardingComplete: 1,
          calorieTrackingEnabled: 1,
          ...patch,
          dirty: 1,
          updatedAt: nowIso(),
        })
      }
      // Antes se navegaba directo, dejando `dirty: 1` esperando el próximo
      // disparador pasivo de sync (reconexión, foreground, el intervalo de
      // 5 min de main.tsx). Si la app se cerraba justo después de terminar
      // el onboarding — muy común, es el momento en que se suelta el
      // teléfono para ir a entrenar — `onboardingComplete` nunca llegaba al
      // servidor, y el próximo login en cualquier dispositivo (o tras
      // reinstalar) volvía a pedir altura/peso porque el perfil remoto no
      // existía todavía. Se le da al push una oportunidad real (hasta 3s)
      // antes de navegar; si no hay red, no bloquea — sigue el mismo camino
      // pasivo de siempre.
      await Promise.race([runSync(userId), new Promise((resolve) => setTimeout(resolve, 3000))])
      navigate('/', { replace: true })
    } catch (e) {
      toast.error('No se pudo guardar', e instanceof Error ? e.message : 'Probá de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg px-6 py-10">
      {/* Progress bar */}
      <div className="mb-8 flex gap-1.5">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-all duration-500',
              i <= step ? 'bg-accent' : 'bg-surface-2'
            )}
          />
        ))}
      </div>

      {/* Steps */}
      {step === 0 && (
        <StepWelcome name={name ?? 'campeón'} quote={quote} onNext={() => setStep(1)} />
      )}
      {step === 1 && (
        <StepPersonal
          sex={sex}
          dob={dob}
          onSex={setSex}
          onDob={setDob}
          onNext={() => setStep(2)}
        />
      )}
      {step === 2 && (
        <StepBody
          weightKg={weightKg}
          heightCm={heightCm}
          goal={goal}
          onWeight={setWeightKg}
          onHeight={setHeightCm}
          onGoal={setGoal}
          onNext={() => setStep(3)}
        />
      )}
      {step === 3 && (
        <StepLevel
          level={level}
          onLevel={setLevel}
          saving={saving}
          onFinish={handleFinish}
          isAdmin={role === 'admin'}
        />
      )}
    </div>
  )
}

// ── Step 0: Bienvenida ─────────────────────────────────────────────────────────

function StepWelcome({
  name,
  quote,
  onNext,
}: {
  name: string
  quote: { text: string; author?: string }
  onNext: () => void
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <RepeMark size={64} className="mb-6 text-accent" />
      <h1 className="mb-2 text-3xl font-bold">
        ¡Bienvenido, {name.split(' ')[0]}!
      </h1>
      <p className="mb-6 text-ink-3">Tu viaje hacia la mejor versión de vos mismo empieza acá.</p>

      <ul className="mb-8 w-full space-y-3 text-left">
        {WELCOME_HIGHLIGHTS.map(({ text, Icon }) => (
          <li key={text} className="flex items-center gap-3 rounded-xl bg-surface p-3.5">
            <Icon size={18} className="shrink-0 text-accent" strokeWidth={1.8} />
            <span className="text-sm text-ink-2">{text}</span>
          </li>
        ))}
      </ul>

      <blockquote className="mb-10 rounded-2xl bg-surface p-6">
        <p className="text-base font-medium italic text-ink">"{quote.text}"</p>
        {quote.author && (
          <footer className="mt-2 text-sm text-ink-3">— {quote.author}</footer>
        )}
      </blockquote>

      <button
        onClick={onNext}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-4 font-bold text-bg"
      >
        Empecemos <ChevronRight size={20} />
      </button>
    </div>
  )
}

// ── Step 1: Datos personales ───────────────────────────────────────────────────

function StepPersonal({
  sex, dob, onSex, onDob, onNext,
}: {
  sex: string
  dob: string
  onSex: (v: 'male' | 'female') => void
  onDob: (v: string) => void
  onNext: () => void
}) {
  const canContinue = sex !== '' && dob !== ''
  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2 text-accent">
          <User size={20} />
          <span className="text-sm font-medium">Paso 1 de 3</span>
        </div>
        <h2 className="text-2xl font-bold">¿Cómo sos?</h2>
        <p className="mt-1 text-sm text-ink-3">
          Estos datos calculan tus niveles de fuerza ajustados por edad y sexo.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="mb-3 block text-sm font-semibold text-ink-2">Sexo biológico</label>
          <div className="grid grid-cols-2 gap-3">
            {[['male', 'Masculino'], ['female', 'Femenino']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => onSex(val as 'male' | 'female')}
                className={cn(
                  'rounded-2xl border py-5 text-center transition-all',
                  sex === val
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-line-2 text-ink-2'
                )}
              >
                <div className="text-base font-semibold">{label}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-ink-2">
            Fecha de nacimiento
          </label>
          {/* Padding en el wrapper, input sin padding propio — ver el
              comentario largo en Profile.tsx (mismo bug de WebKit). */}
          <div className="rounded-xl bg-surface px-4 ring-1 ring-line-2 transition [color-scheme:dark] focus-within:ring-accent">
            <input
              type="date"
              value={dob}
              onChange={(e) => onDob(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className="w-full bg-transparent py-3 outline-none"
            />
          </div>
        </div>
      </div>

      <div className="mt-auto pt-8">
        <button
          onClick={onNext}
          disabled={!canContinue}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-4 font-bold text-bg disabled:opacity-40"
        >
          Continuar <ChevronRight size={20} />
        </button>
        {!canContinue && (
          <p className="mt-2 text-center text-xs text-ink-3">Completá todos los campos para continuar.</p>
        )}
      </div>
    </div>
  )
}

// ── Step 2: Datos corporales + objetivo ───────────────────────────────────────

function StepBody({
  weightKg, heightCm, goal, onWeight, onHeight, onGoal, onNext,
}: {
  weightKg: string
  heightCm: string
  goal: FitnessGoal | ''
  onWeight: (v: string) => void
  onHeight: (v: string) => void
  onGoal: (v: FitnessGoal) => void
  onNext: () => void
}) {
  const canContinue = weightKg !== '' && goal !== ''
  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2 text-accent">
          <Target size={20} />
          <span className="text-sm font-medium">Paso 2 de 3</span>
        </div>
        <h2 className="text-2xl font-bold">Tu cuerpo y tu meta</h2>
        <p className="mt-1 text-sm text-ink-3">
          Tu peso nos ayuda a calcular el volumen de entrenamiento y tu progreso.
        </p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-2 block text-sm font-semibold text-ink-2">
              Peso (kg) <span className="text-accent">*</span>
            </label>
            <input
              type="number"
              value={weightKg}
              onChange={(e) => onWeight(e.target.value)}
              min={30}
              max={300}
              placeholder="Ej: 75"
              className="w-full rounded-xl bg-surface px-4 py-3 font-mono outline-none ring-1 ring-line-2 transition focus:ring-accent"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-ink-2">
              Altura (cm)
            </label>
            <input
              type="number"
              value={heightCm}
              onChange={(e) => onHeight(e.target.value)}
              min={100}
              max={250}
              placeholder="Ej: 175"
              className="w-full rounded-xl bg-surface px-4 py-3 font-mono outline-none ring-1 ring-line-2 transition focus:ring-accent"
            />
          </div>
        </div>

        <div>
          <label className="mb-3 block text-sm font-semibold text-ink-2">
            ¿Cuál es tu objetivo? <span className="text-accent">*</span>
          </label>
          <div className="grid grid-cols-1 gap-2">
            {GOALS.map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => onGoal(key)}
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all',
                  goal === key
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-line-2 text-ink-2'
                )}
              >
                <Icon size={20} strokeWidth={1.8} />
                <span className="font-semibold">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-auto pt-8">
        <button
          onClick={onNext}
          disabled={!canContinue}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-4 font-bold text-bg disabled:opacity-40"
        >
          Continuar <ChevronRight size={20} />
        </button>
      </div>
    </div>
  )
}

// ── Step 3: Nivel de experiencia ───────────────────────────────────────────────

function StepLevel({
  level, onLevel, saving, onFinish, isAdmin,
}: {
  level: ExperienceLevel | ''
  onLevel: (v: ExperienceLevel) => void
  saving: boolean
  onFinish: () => void
  isAdmin: boolean
}) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2 text-accent">
          <Trophy size={20} />
          <span className="text-sm font-medium">Paso 3 de 3</span>
        </div>
        <h2 className="text-2xl font-bold">Tu nivel</h2>
        <p className="mt-1 text-sm text-ink-3">
          Esto ayuda a calibrar las sugerencias de carga inicial.
        </p>
      </div>

      <div className="space-y-3">
        {LEVELS.map(({ key, label, desc }) => (
          <button
            key={key}
            onClick={() => onLevel(key)}
            className={cn(
              'w-full rounded-2xl border p-4 text-left transition-all',
              level === key ? 'border-accent bg-accent/10' : 'border-line-2'
            )}
          >
            <p className={cn('font-bold', level === key ? 'text-accent' : 'text-ink')}>
              {label}
            </p>
            <p className="text-sm text-ink-3">{desc}</p>
          </button>
        ))}
      </div>

      {isAdmin && (
        <div className="mt-4 rounded-xl bg-accent/10 p-4">
          <p className="text-sm font-semibold text-accent">
            Sos el administrador de esta instalación.
          </p>
          <p className="mt-0.5 text-xs text-ink-3">
            Podés gestionar usuarios desde el panel de administración en tu perfil.
          </p>
        </div>
      )}

      <div className="mt-auto pt-8">
        <button
          onClick={onFinish}
          disabled={!level || saving}
          className="w-full rounded-xl bg-accent py-4 font-bold text-bg disabled:opacity-40"
        >
          {saving ? 'Guardando…' : '¡A entrenar!'}
        </button>
      </div>
    </div>
  )
}
