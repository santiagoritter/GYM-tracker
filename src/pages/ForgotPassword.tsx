import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, KeyRound, RefreshCw } from 'lucide-react'
import { requestPasswordReset, confirmPasswordReset } from '@/lib/supabaseAuth'
import { db, ensureProfile } from '@/db/schema'
import { migrateLocalUserToSupabase } from '@/db/migrateLocalUserToSupabase'

type Step = 'request' | 'reset'

export default function ForgotPassword() {
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('request')
  const [email, setEmail] = useState('')

  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const codeInputRef = useRef<HTMLInputElement>(null)

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await requestPasswordReset(email)
      setStep('reset')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al pedir el código.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return }
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return }
    setLoading(true)
    try {
      const user = await confirmPasswordReset(email, code, password)
      // Mismo criterio que Login.tsx: el remapeo de datos locales previos
      // corre acá también, por si esta cuenta ya tenía historial bajo un
      // id local viejo (ver migrateLocalUserToSupabase.ts).
      await migrateLocalUserToSupabase(user.id, user.email)
      await ensureProfile(user.id)
      const profile = await db.profile.get(user.id)
      navigate(profile?.onboardingComplete === 1 ? '/' : '/onboarding', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Código inválido.')
      setCode('')
      codeInputRef.current?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return
    setError('')
    setLoading(true)
    try {
      await requestPasswordReset(email)
      setResendCooldown(60)
      const interval = setInterval(() => {
        setResendCooldown((s) => { if (s <= 1) { clearInterval(interval); return 0 } return s - 1 })
      }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al reenviar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 py-10">
      <div className="animate-fade-up mb-8 flex flex-col items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-accent">
          <KeyRound size={32} className="text-bg" strokeWidth={2.5} />
        </div>
        <h1 className="text-2xl font-bold">
          {step === 'reset' ? 'Elegí una contraseña nueva' : 'Recuperar contraseña'}
        </h1>
        <p className="text-center text-sm text-ink-3">
          {step === 'reset'
            ? <>Te mandamos un código a<br /><span className="font-semibold text-ink-2">{email}</span></>
            : 'Te mandamos un código para volver a entrar.'
          }
        </p>
      </div>

      {step === 'request' ? (
        <form onSubmit={handleRequest} className="animate-fade-up w-full max-w-sm space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
              placeholder="tu@email.com"
              className="h-12 w-full rounded-sm bg-surface px-4 text-base outline-none ring-1 ring-line-2 transition focus:ring-accent"
            />
          </div>

          {error && (
            <p className="animate-fade-up rounded-sm bg-danger/10 px-4 py-2.5 text-sm text-danger">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-14 w-full rounded-sm bg-accent font-bold text-bg transition active:opacity-80 disabled:opacity-50"
          >
            {loading ? 'Enviando…' : 'Enviar código'}
          </button>

          <p className="text-center text-sm text-ink-3">
            <Link to="/login" className="font-semibold text-accent">
              Volver a iniciar sesión
            </Link>
          </p>
        </form>
      ) : (
        <form onSubmit={handleReset} className="animate-fade-up w-full max-w-sm space-y-4">
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

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-2">Contraseña nueva</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="Mínimo 6 caracteres"
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

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-2">
              Confirmar contraseña
            </label>
            <input
              type={showPw ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="Repetí la contraseña"
              className="h-12 w-full rounded-sm bg-surface px-4 text-base outline-none ring-1 ring-line-2 transition focus:ring-accent"
            />
          </div>

          {error && (
            <p className="animate-fade-up rounded-sm bg-danger/10 px-4 py-2.5 text-sm text-danger">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="h-14 w-full rounded-sm bg-accent font-bold text-bg transition active:opacity-80 disabled:opacity-50"
          >
            {loading ? 'Guardando…' : 'Cambiar contraseña'}
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0 || loading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-sm bg-surface text-sm text-ink-2 transition active:opacity-70 disabled:opacity-40"
          >
            <RefreshCw size={15} />
            {resendCooldown > 0 ? `Reenviar en ${resendCooldown}s` : 'Reenviar código'}
          </button>
        </form>
      )}
    </div>
  )
}
