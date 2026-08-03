import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Dumbbell, Eye, EyeOff, Mail } from 'lucide-react'
import { loginUser, resendVerificationEmail } from '@/lib/auth'
import { useAuthStore } from '@/stores/authStore'
import { db, ensureProfile } from '@/db/schema'

export default function Login() {
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [unverifiedUserId, setUnverifiedUserId] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setUnverifiedUserId(null)
    setLoading(true)
    try {
      const user = await loginUser(email, password)
      setSession(user.id, user.role, user.name)
      await ensureProfile(user.id)

      if (user.onboardingComplete === 0) {
        navigate('/onboarding', { replace: true })
      } else {
        navigate('/', { replace: true })
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'EMAIL_NOT_VERIFIED') {
        const u = await db.users.where('email').equals(email.toLowerCase().trim()).first()
        if (u) setUnverifiedUserId(u.id)
        setError('Verificá tu email antes de ingresar.')
      } else {
        setError(err instanceof Error ? err.message : 'Error al iniciar sesión.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResendFromLogin = async () => {
    if (!unverifiedUserId) return
    setLoading(true)
    try {
      await resendVerificationEmail(unverifiedUserId)
      setError('Código reenviado. Revisá tu email.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al reenviar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6">
      <div className="mb-10 flex flex-col items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent">
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
            className="w-full rounded-xl bg-surface px-4 py-3 text-base outline-none ring-1 ring-line-2 transition focus:ring-accent"
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
              className="w-full rounded-xl bg-surface px-4 py-3 pr-11 text-base outline-none ring-1 ring-line-2 transition focus:ring-accent"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3"
            >
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-danger/10 px-4 py-2.5 text-sm text-danger space-y-2">
            <p>{error}</p>
            {unverifiedUserId && (
              <button
                type="button"
                onClick={handleResendFromLogin}
                disabled={loading}
                className="flex items-center gap-1.5 font-semibold text-accent underline underline-offset-2"
              >
                <Mail size={13} /> Reenviar código de verificación
              </button>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-accent py-3.5 font-bold text-bg transition active:opacity-80 disabled:opacity-50"
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
