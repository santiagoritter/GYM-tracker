import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Dumbbell, Eye, EyeOff } from 'lucide-react'
import { registerUser } from '@/lib/auth'
import { useAuthStore } from '@/stores/authStore'

export default function Registro() {
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setLoading(true)
    try {
      const user = await registerUser(email, password, name.trim())
      setSession(user.id, user.role, user.name)
      navigate('/onboarding', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrarse.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 py-10">
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent">
          <Dumbbell size={32} className="text-bg" strokeWidth={2.5} />
        </div>
        <h1 className="text-2xl font-bold">Crear cuenta</h1>
        <p className="text-sm text-ink-3">El primer paso hacia tu mejor versión.</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-2">Nombre</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            placeholder="¿Cómo te llamás?"
            className="w-full rounded-xl bg-surface px-4 py-3 text-sm outline-none ring-1 ring-line-2 transition focus:ring-accent"
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
            className="w-full rounded-xl bg-surface px-4 py-3 text-sm outline-none ring-1 ring-line-2 transition focus:ring-accent"
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
              className="w-full rounded-xl bg-surface px-4 py-3 pr-11 text-sm outline-none ring-1 ring-line-2 transition focus:ring-accent"
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
            className="w-full rounded-xl bg-surface px-4 py-3 text-sm outline-none ring-1 ring-line-2 transition focus:ring-accent"
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
          {loading ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>

        <p className="text-center text-sm text-ink-3">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="font-semibold text-accent">
            Iniciá sesión
          </Link>
        </p>
      </form>
    </div>
  )
}
