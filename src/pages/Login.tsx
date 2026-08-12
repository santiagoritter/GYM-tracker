import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Dumbbell, Eye, EyeOff, Mail } from 'lucide-react'
import { signIn, verifySignupCode, resendSignupCode, EMAIL_NOT_VERIFIED, type AuthUser } from '@/lib/supabaseAuth'
import { db, ensureProfile } from '@/db/schema'
import { migrateLocalUserToSupabase } from '@/db/migrateLocalUserToSupabase'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null)
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // El listener de onAuthStateChange en main.tsx ya deja authStore al
  // día — acá solo hace falta el perfil local y, si esta cuenta ya
  // tenía historial bajo un id local viejo, remapearlo.
  const finishAuth = async (user: AuthUser) => {
    await migrateLocalUserToSupabase(user.id, user.email)
    await ensureProfile(user.id)
    const profile = await db.profile.get(user.id)
    navigate(profile?.onboardingComplete === 1 ? '/' : '/onboarding', { replace: true })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setUnverifiedEmail(null)
    setLoading(true)
    try {
      const user = await signIn(email, password)
      await finishAuth(user)
    } catch (err) {
      if (err instanceof Error && err.message === EMAIL_NOT_VERIFIED) {
        const normalized = email.toLowerCase().trim()
        setUnverifiedEmail(normalized)
        setError('Verificá tu email antes de ingresar. Te reenviamos un código.')
        await resendSignupCode(normalized).catch(() => undefined)
      } else {
        setError(err instanceof Error ? err.message : 'Error al iniciar sesión.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResendFromLogin = async () => {
    if (!unverifiedEmail) return
    setError('')
    setLoading(true)
    try {
      await resendSignupCode(unverifiedEmail)
      setError('Código reenviado.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al reenviar.')
    } finally {
      setLoading(false)
    }
  }

  const handleCodeInput = (i: number, val: string) => {
    if (!/^\d*$/.test(val)) return
    const next = [...code]
    next[i] = val.slice(-1)
    setCode(next)
    if (val && i < 5) inputRefs.current[i + 1]?.focus()
    if (next.every(Boolean)) verifyCode(next.join(''))
  }

  const handleCodeKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) {
      inputRefs.current[i - 1]?.focus()
    }
  }

  const verifyCode = async (fullCode: string) => {
    if (!unverifiedEmail) return
    setError('')
    setLoading(true)
    try {
      const user = await verifySignupCode(unverifiedEmail, fullCode)
      await finishAuth(user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Código inválido.')
      setCode(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  if (unverifiedEmail) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-accent">
            <Mail size={32} className="text-bg" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold">Verificá tu email</h1>
          <p className="text-center text-sm text-ink-3">
            Ingresá el código de 6 dígitos que te mandamos.
          </p>
        </div>

        <div className="w-full max-w-sm space-y-6">
          {/* gap-2, no gap-3: 6 casillas de 48px + 5 gaps de 12px = 348px
              desborda los ~345px disponibles en un iPhone 14 Pro (393px). */}
          <div className="flex justify-center gap-2">
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeInput(i, e.target.value)}
                onKeyDown={(e) => handleCodeKeyDown(i, e)}
                className="h-14 w-12 rounded-sm bg-surface text-center text-xl font-bold tabular-nums outline-none ring-1 ring-line-2 transition focus:ring-accent"
                autoFocus={i === 0}
              />
            ))}
          </div>

          {error && (
            <p className="rounded-sm bg-danger/10 px-4 py-2.5 text-center text-sm text-danger">
              {error}
            </p>
          )}

          <button
            onClick={handleResendFromLogin}
            disabled={loading}
            className="h-12 w-full rounded-sm bg-surface text-sm text-ink-2 transition active:opacity-70 disabled:opacity-40"
          >
            Reenviar código
          </button>

          <button
            onClick={() => setUnverifiedEmail(null)}
            className="h-11 w-full text-center text-sm text-ink-3"
          >
            Volver
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6">
      <div className="mb-10 flex flex-col items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-accent">
          <Dumbbell size={32} className="text-bg" strokeWidth={2.5} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">GymTracker</h1>
        <p className="text-sm text-ink-3">Tu progreso, siempre con vos.</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="tu@email.com"
            className="h-12 w-full rounded-sm bg-surface px-4 text-base outline-none ring-1 ring-line-2 transition focus:ring-accent"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-2">Contraseña</label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="h-12 w-full rounded-sm bg-surface px-4 pr-11 text-base outline-none ring-1 ring-line-2 transition focus:ring-accent"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              aria-label={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              className="absolute right-0 top-0 flex h-12 w-11 items-center justify-center text-ink-3"
            >
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {error && (
          <p className="rounded-sm bg-danger/10 px-4 py-2.5 text-sm text-danger">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="h-14 w-full rounded-sm bg-accent font-bold text-bg transition active:opacity-80 disabled:opacity-50"
        >
          {loading ? 'Ingresando…' : 'Ingresar'}
        </button>

        <p className="text-center text-sm text-ink-3">
          ¿No tenés cuenta?{' '}
          <Link to="/registro" className="font-semibold text-accent">
            Registrate
          </Link>
        </p>
      </form>
    </div>
  )
}
