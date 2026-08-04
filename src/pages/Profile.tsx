import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { Bell, LogOut, Ruler, Shield } from 'lucide-react'
import { db } from '@/db/schema'
import { useAuthStore } from '@/stores/authStore'
import type { LocalProfile } from '@/types'
import { cn } from '@/lib/utils'
import { getDailyMessage } from '@/lib/motivational'

const GOAL_LABELS: Record<string, string> = {
  strength: 'Fuerza máxima',
  mass: 'Ganar masa',
  endurance: 'Resistencia',
  health: 'Salud general',
  general: 'Todo un poco',
}

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
}

const dailyMsg = getDailyMessage()

export default function Profile() {
  const navigate = useNavigate()
  const { userId, name, role, clearSession } = useAuthStore()
  const profile = useLiveQuery(
    () => (userId ? db.profile.get(userId) : undefined),
    [userId]
  )
  const user = useLiveQuery(() => (userId ? db.users.get(userId) : undefined), [userId])

  const update = (patch: Partial<LocalProfile>) => {
    if (userId) db.profile.update(userId, patch)
  }

  const handleLogout = () => {
    clearSession()
    navigate('/login', { replace: true })
  }

  if (!profile) return null

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Perfil</h1>

      {/* Cita motivacional */}
      <blockquote className="rounded-xl bg-surface/60 px-4 py-3 text-sm italic text-ink-2">
        "{dailyMsg.text}"
        {dailyMsg.author && (
          <footer className="mt-1 text-xs not-italic text-ink-3">— {dailyMsg.author}</footer>
        )}
      </blockquote>

      {/* Datos del usuario */}
      <section className="rounded-2xl bg-surface p-5 space-y-1">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-sm font-bold text-bg">
            {(name ?? 'U').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
          </div>
          <div>
            <p className="font-semibold">{name}</p>
            <p className="text-sm text-ink-3">{user?.email}</p>
          </div>
          {role === 'admin' && (
            <span className="ml-auto rounded bg-accent/15 px-2 py-1 text-xs font-bold text-accent">
              ADMIN
            </span>
          )}
        </div>
        {profile.goal && (
          <p className="text-sm text-ink-2">
            <span className="text-ink-3">Objetivo:</span>{' '}
            {GOAL_LABELS[profile.goal] ?? profile.goal}
          </p>
        )}
        {profile.level && (
          <p className="text-sm text-ink-2">
            <span className="text-ink-3">Nivel:</span>{' '}
            {LEVEL_LABELS[profile.level] ?? profile.level}
          </p>
        )}
      </section>

      {/* Configuración */}
      <section className="space-y-4 rounded-2xl bg-surface p-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-ink-2">Unidades</label>
          <div className="flex gap-2">
            {(['kg', 'lbs'] as const).map((u) => (
              <button
                key={u}
                onClick={() => update({ units: u })}
                className={cn(
                  'flex-1 rounded-lg border py-2.5 text-sm font-semibold uppercase',
                  profile.units === u
                    ? 'border-accent bg-accent text-bg'
                    : 'border-line-2 text-ink-2'
                )}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-ink-2">
            Peso corporal (kg)
          </label>
          <input
            type="number"
            value={profile.bodyWeightKg ?? ''}
            onChange={(e) =>
              update({ bodyWeightKg: Number(e.target.value) || undefined })
            }
            placeholder="Ej: 75"
            className="w-full rounded-lg bg-surface-2 px-3 py-2.5 font-mono outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-ink-2">
            Descanso por defecto (segundos)
          </label>
          <div className="flex gap-2">
            {[60, 90, 120, 180].map((s) => (
              <button
                key={s}
                onClick={() => update({ restTimerDefault: s })}
                className={cn(
                  'flex-1 rounded-lg border py-2.5 font-mono text-sm font-semibold',
                  profile.restTimerDefault === s
                    ? 'border-accent bg-accent text-bg'
                    : 'border-line-2 text-ink-2'
                )}
              >
                {s}s
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-ink-2">
            Meta semanal (entrenos)
          </label>
          <div className="flex gap-2">
            {[2, 3, 4, 5, 6].map((n) => (
              <button
                key={n}
                onClick={() => update({ weeklyGoal: n })}
                className={cn(
                  'flex-1 rounded-lg border py-2.5 font-mono text-sm font-semibold',
                  (profile.weeklyGoal ?? 3) === n
                    ? 'border-accent bg-accent text-bg'
                    : 'border-line-2 text-ink-2'
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-ink-2">Sexo</label>
          <div className="flex gap-2">
            {(
              [
                ['male', 'Masculino'],
                ['female', 'Femenino'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() => update({ sex: value })}
                className={cn(
                  'flex-1 rounded-lg border py-2.5 text-sm font-semibold',
                  profile.sex === value
                    ? 'border-accent bg-accent text-bg'
                    : 'border-line-2 text-ink-2'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-ink-2">
            Fecha de nacimiento
          </label>
          <input
            type="date"
            value={profile.dob ?? ''}
            onChange={(e) => update({ dob: e.target.value || undefined })}
            className="w-full rounded-lg bg-surface-2 px-3 py-2.5 outline-none focus:ring-1 focus:ring-accent [color-scheme:dark]"
          />
        </div>
      </section>

      {/* Accesos a paneles */}
      <button
        onClick={() => navigate('/medidas')}
        className="flex w-full items-center gap-3 rounded-2xl bg-surface p-4 text-left active:bg-surface-2"
      >
        <Ruler size={20} className="text-accent" />
        <div>
          <p className="font-semibold">Medidas corporales</p>
          <p className="text-sm text-ink-3">Registrá tu peso y medidas, y ve tu evolución</p>
        </div>
      </button>

      <button
        onClick={() => navigate('/recordatorios')}
        className="flex w-full items-center gap-3 rounded-2xl bg-surface p-4 text-left active:bg-surface-2"
      >
        <Bell size={20} className="text-accent" />
        <div>
          <p className="font-semibold">Recordatorios</p>
          <p className="text-sm text-ink-3">Avisos para no perder tu racha de entrenos</p>
        </div>
      </button>

      {/* Admin panel link */}
      {role === 'admin' && (
        <button
          onClick={() => navigate('/admin')}
          className="flex w-full items-center gap-3 rounded-2xl bg-surface p-4 text-left active:bg-surface-2"
        >
          <Shield size={20} className="text-accent" />
          <div>
            <p className="font-semibold">Panel de administración</p>
            <p className="text-sm text-ink-3">Gestionar usuarios y ver estadísticas globales</p>
          </div>
        </button>
      )}

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="flex w-full items-center gap-3 rounded-2xl border border-danger/30 p-4 text-danger active:bg-danger/10"
      >
        <LogOut size={20} />
        <span className="font-semibold">Cerrar sesión</span>
      </button>

      <p className="text-center text-xs text-ink-3">
        GymTracker v0.1 · Modo local · Tus datos viven solo en este dispositivo
      </p>
    </div>
  )
}
