import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Dumbbell, Eye, EyeOff, Mail, RefreshCw } from 'lucide-react'
import { signUp, verifySignupCode, resendSignupCode } from '@/lib/supabaseAuth'
import { ensureProfile } from '@/db/schema'
import { migrateLocalUserToSupabase } from '@/db/migrateLocalUserToSupabase'

type Step = 'form' | 'verify'

export default function Registro() {
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('form')

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
      await signUp(email, password, name.trim())
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
    setError('')
    setLoading(true)
    try {
      const user = await verifySignupCode(email, fullCode)
      // El listener de onAuthStateChange en main.tsx ya actualiza
      // authStore — acá solo hace falta el perfil local y el remapeo de
      // datos previos (si esta cuenta ya tenía historial local con un id
      // viejo, ver migrateLocalUserToSupabase.ts).
      await migrateLocalUserToSupabase(user.id, user.email)
      await ensureProfile(user.id)
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
    if (resendCooldown > 0) return
    setError('')
    setLoading(true)
    try {
      await resendSignupCode(email)
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
        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-accent">
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
              className="h-12 w-full rounded-sm bg-surface px-4 text-base outline-none ring-1 ring-line-2 transition focus:ring-accent"
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
            <p className="rounded-sm bg-danger/10 px-4 py-2.5 text-sm text-danger">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-14 w-full rounded-sm bg-accent font-bold text-bg transition active:opacity-80 disabled:opacity-50"
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
          {/* Inputs de código 6 dígitos. gap-2, no gap-3: a 393px de ancho
              6 casillas de 48px + gaps de 12px desbordan por ~3px. */}
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
            <p className="rounded-sm bg-danger/10 px-4 py-2.5 text-sm text-danger text-center">
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
            className="flex h-12 w-full items-center justify-center gap-2 rounded-sm bg-surface text-sm text-ink-2 transition active:opacity-70 disabled:opacity-40"
          >
            <RefreshCw size={15} />
            {resendCooldown > 0
              ? `Reenviar en ${resendCooldown}s`
              : 'Reenviar código'
            }
          </button>

          <p className="text-center text-xs text-ink-3">
            El código expira solo — si tarda, pedí uno nuevo.
          </p>
        </div>
      )}
    </div>
  )
}
