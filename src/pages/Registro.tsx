import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Dumbbell, Eye, EyeOff, Mail, RefreshCw } from 'lucide-react'
import { registerUser, verifyEmailCode, resendVerificationEmail } from '@/lib/auth'
import { useAuthStore } from '@/stores/authStore'
import type { User } from '@/types'

type Step = 'form' | 'verify'

export default function Registro() {
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)

  const [step, setStep] = useState<Step>('form')
  const [pendingUser, setPendingUser] = useState<User | null>(null)

  // Formulario
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)

  // Verificación
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  // ── Paso 1: registro ──────────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return }
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return }
    setLoading(true)
    try {
      const user = await registerUser(email, password, name.trim())
      setPendingUser(user)
      setStep('verify')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrarse.')
    } finally {
      setLoading(false)
    }
  }

  // ── Paso 2: verificar código ──────────────────────────────────────────────
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
    if (!pendingUser) return
    setError('')
    setLoading(true)
    try {
      await verifyEmailCode(pendingUser.id, fullCode)
      setSession(pendingUser.id, pendingUser.role, pendingUser.name)
      navigate('/onboarding', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Código inválido.')
      setCode(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!pendingUser || resendCooldown > 0) return
    setError('')
    setLoading(true)
    try {
      await resendVerificationEmail(pendingUser.id)
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 py-10">
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent">
          {step === 'verify'
            ? <Mail size={32} className="text-bg" strokeWidth={2.5} />
            : <Dumbbell size={32} className="text-bg" strokeWidth={2.5} />
          }
        </div>
        <h1 className="text-2xl font-bold">
          {step === 'verify' ? 'Verificá tu email' : 'Crear cuenta'}
        </h1>
        <p className="text-center text-sm text-ink-3">
          {step === 'verify'
            ? <>Te mandamos un código de 6 dígitos a<br /><span className="font-semibold text-ink-2">{email}</span></>
            : 'El primer paso hacia tu mejor versión.'
          }
        </p>
      </div>

      {step === 'form' ? (
        <form onSubmit={handleRegister} className="w-full max-w-sm space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-2">Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              placeholder="¿Cómo te llamás?"
              className="w-full rounded-xl bg-surface px-4 py-3 text-base outline-none ring-1 ring-line-2 transition focus:ring-accent"
            />
          </div>

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
                autoComplete="new-password"
                placeholder="Mínimo 6 caracteres"
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
              className="w-full rounded-xl bg-surface px-4 py-3 text-base outline-none ring-1 ring-line-2 transition focus:ring-accent"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-danger/10 px-4 py-2.5 text-sm text-danger">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-accent py-3.5 font-bold text-bg transition active:opacity-80 disabled:opacity-50"
          >
            {loading ? 'Enviando…' : 'Crear cuenta'}
          </button>

          <p className="text-center text-sm text-ink-3">
            ¿Ya tenés cuenta?{' '}
            <Link to="/login" className="font-semibold text-accent">
              Iniciá sesión
            </Link>
          </p>
        </form>
      ) : (
        <div className="w-full max-w-sm space-y-6">
          {/* Inputs de código 6 dígitos */}
          <div className="flex justify-center gap-3">
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
                className="h-14 w-12 rounded-xl bg-surface text-center text-xl font-bold outline-none ring-1 ring-line-2 transition focus:ring-accent"
                autoFocus={i === 0}
              />
            ))}
          </div>

          {error && (
            <p className="rounded-lg bg-danger/10 px-4 py-2.5 text-sm text-danger text-center">
              {error}
            </p>
          )}

          {loading && (
            <p className="text-center text-sm text-ink-3">Verificando…</p>
          )}

          {/* Reenviar código */}
          <button
            onClick={handleResend}
            disabled={resendCooldown > 0 || loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-surface py-3 text-sm text-ink-2 transition active:opacity-70 disabled:opacity-40"
          >
            <RefreshCw size={15} />
            {resendCooldown > 0
              ? `Reenviar en ${resendCooldown}s`
              : 'Reenviar código'
            }
          </button>

          <p className="text-center text-xs text-ink-3">
            El código expira en 15 minutos.
          </p>
        </div>
      )}
    </div>
  )
}
