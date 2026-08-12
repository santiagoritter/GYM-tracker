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
  const [code, setCode] = useState('')
  const codeInputRef = useRef<HTMLInputElement>(null)

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

  // Un solo campo, no cajita-por-dígito: el código que manda Supabase no
  // tiene un largo fijo confiable (8 dígitos en la práctica, no los 6 que
  // se había asumido al principio) — un input de texto normal no depende
  // de adivinar ese número, y de paso permite pegar el código completo.
  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (code.trim()) verifyCode(code.trim())
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
      setCode('')
      codeInputRef.current?.focus()
    } finally {
      setLoading(false)
    }
  }

  if (unverifiedEmail) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6">
        <div className="animate-fade-up mb-8 flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-accent">
            <Mail size={32} className="text-bg" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold">Verificá tu email</h1>
          <p className="text-center text-sm text-ink-3">
            Ingresá el código que te mandamos.
          </p>
        </div>

        <form onSubmit={handleVerifySubmit} className="animate-fade-up w-full max-w-sm space-y-6">
          <input
            ref={codeInputRef}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="Código del email"
            autoFocus
            className="h-14 w-full rounded-sm bg-surface text-center text-2xl font-bold tracking-[0.3em] tabular-nums outline-none ring-1 ring-line-2 transition focus:ring-accent"
          />

          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="h-14 w-full rounded-sm bg-accent font-bold text-bg transition active:opacity-80 disabled:opacity-50"
          >
            {loading ? 'Verificando…' : 'Verificar código'}
          </button>

          {error && (
            <p className="animate-fade-up rounded-sm bg-danger/10 px-4 py-2.5 text-center text-sm text-danger">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleResendFromLogin}
            disabled={loading}
            className="h-12 w-full rounded-sm bg-surface text-sm text-ink-2 transition active:opacity-70 disabled:opacity-40"
          >
            Reenviar código
          </button>

          <button
            type="button"
            onClick={() => setUnverifiedEmail(null)}
            className="h-11 w-full text-center text-sm text-ink-3"
          >
            Volver
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6">
      <div className="animate-fade-up mb-10 flex flex-col items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-accent">
          <Dumbbell size={32} className="text-bg" strokeWidth={2.5} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">GymTracker</h1>
        <p className="text-sm text-ink-3">Tu progreso, siempre con vos.</p>
      </div>

      <form onSubmit={handleSubmit} className="animate-fade-up w-full max-w-sm space-y-4">
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
          <p className="animate-fade-up rounded-sm bg-danger/10 px-4 py-2.5 text-sm text-danger">{error}</p>
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
