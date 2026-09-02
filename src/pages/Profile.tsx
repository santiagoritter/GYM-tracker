import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { LogOut, Ruler, Settings, Shield, Users } from 'lucide-react'
import { db } from '@/db/schema'
import { useAuthStore } from '@/stores/authStore'
import { signOut } from '@/lib/supabaseAuth'
import { Card, Row } from '@/components/ui/Card'
import MyCoachCard from '@/components/gym/MyCoachCard'
import type { LocalProfile } from '@/types'
import { cn } from '@/lib/utils'
import { getDailyMessage } from '@/lib/motivational'
import { LEVEL_LABELS } from '@/lib/strengthStandards'

const GOAL_LABELS: Record<string, string> = {
  strength: 'Fuerza máxima',
  mass: 'Ganar masa',
  endurance: 'Resistencia',
  health: 'Salud general',
  general: 'Todo un poco',
}

const dailyMsg = getDailyMessage()

export default function Profile() {
  const navigate = useNavigate()
  const { userId, name, email, role } = useAuthStore()
  const profile = useLiveQuery(
    () => (userId ? db.profile.get(userId) : undefined),
    [userId]
  )

  const update = (patch: Partial<LocalProfile>) => {
    if (userId) db.profile.update(userId, patch)
  }

  const handleLogout = async () => {
    // No alcanza con limpiar authStore: sin esto la sesión de Supabase
    // (persistida en localStorage por supabase-js) se restaura sola al
    // recargar, vía el listener de onAuthStateChange en main.tsx.
    await signOut()
    navigate('/login', { replace: true })
  }

  if (!profile) return null

  return (
    <div className="mx-auto content-width space-y-5">
      <h1 className="text-2xl font-bold">Perfil</h1>

      {/* Cita motivacional */}
      <blockquote className="px-1 text-[13px] italic leading-relaxed text-ink-3">
        "{dailyMsg.text}"
        {dailyMsg.author && <footer className="mt-0.5 not-italic">— {dailyMsg.author}</footer>}
      </blockquote>

      {/* Identidad */}
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-bg">
            {(name ?? 'U').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{name}</p>
            <p className="truncate text-sm text-ink-3">{email}</p>
          </div>
          {(role === 'admin' || role === 'coach') && (
            <span className="shrink-0 rounded-xs bg-accent/15 px-2 py-1 text-xs font-bold text-accent">
              {role === 'admin' ? 'Admin' : 'Coach'}
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
      </Card>

      {userId && <MyCoachCard userId={userId} />}

      {/* Datos corporales: alimentan el recomendador de cargas y los
          niveles de fuerza. Lo que es comportamiento de la app (unidades,
          descanso, tema...) vive en Ajustes. */}
      <section>
        <Card>
          <Row className="flex-col items-stretch gap-2">
            <label className="text-[13px] font-medium text-ink-2">Peso corporal (kg)</label>
            <input
              type="number"
              inputMode="decimal"
              value={profile.bodyWeightKg ?? ''}
              onChange={(e) => update({ bodyWeightKg: Number(e.target.value) || undefined })}
              placeholder="Ej: 75"
              className="h-11 w-full rounded-xs bg-surface-2 px-3 font-mono tabular-nums outline-none focus:ring-1 focus:ring-accent"
            />
          </Row>
          <Row className="flex-col items-stretch gap-2">
            <label className="text-[13px] font-medium text-ink-2">% de grasa corporal</label>
            <input
              type="number"
              inputMode="decimal"
              min={3}
              max={60}
              step={0.1}
              value={profile.bodyFatPct ?? ''}
              onChange={(e) => update({ bodyFatPct: Number(e.target.value) || undefined })}
              placeholder="Opcional"
              className="h-11 w-full rounded-xs bg-surface-2 px-3 font-mono tabular-nums outline-none focus:ring-1 focus:ring-accent"
            />
          </Row>
          <Row className="flex-col items-stretch gap-2">
            <label className="text-[13px] font-medium text-ink-2">Sexo</label>
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
                    'h-11 flex-1 rounded-xs border text-sm font-semibold',
                    profile.sex === value
                      ? 'border-accent bg-accent text-bg'
                      : 'border-line-2 text-ink-2'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </Row>
          <Row className="flex-col items-stretch gap-2">
            <label className="text-[13px] font-medium text-ink-2">Fecha de nacimiento</label>
            <input
              type="date"
              value={profile.dob ?? ''}
              onChange={(e) => update({ dob: e.target.value || undefined })}
              className="h-11 w-full rounded-xs bg-surface-2 px-3 outline-none focus:ring-1 focus:ring-accent [color-scheme:dark]"
            />
          </Row>
        </Card>
      </section>

      {/* Accesos */}
      <Card>
        <Row onClick={() => navigate('/medidas')}>
          <Ruler size={20} className="shrink-0 text-accent" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Medidas corporales</p>
            <p className="text-[13px] text-ink-3">Registrá tu peso y medidas</p>
          </div>
        </Row>
        <Row onClick={() => navigate('/ajustes')}>
          <Settings size={20} className="shrink-0 text-accent" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Ajustes</p>
            <p className="text-[13px] text-ink-3">Unidades, tema, recordatorios</p>
          </div>
        </Row>
        {(role === 'coach' || role === 'admin') && (
          <Row onClick={() => navigate('/coach')}>
            <Users size={20} className="shrink-0 text-accent" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Mis alumnos</p>
              <p className="text-[13px] text-ink-3">Ver progreso, asignar rutinas y metas</p>
            </div>
          </Row>
        )}
        {role === 'admin' && (
          <Row onClick={() => navigate('/admin')}>
            <Shield size={20} className="shrink-0 text-accent" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Panel de administración</p>
              <p className="text-[13px] text-ink-3">Usuarios y estadísticas globales</p>
            </div>
          </Row>
        )}
      </Card>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="flex h-14 w-full items-center gap-3 rounded-md border border-danger/30 px-4 text-danger active:bg-danger/10"
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
