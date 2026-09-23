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
import { GOAL_LABELS, LEVEL_LABELS } from '@/lib/strengthStandards'

const dailyMsg = getDailyMessage()

export default function Profile() {
  const navigate = useNavigate()
  const userId = useAuthStore((s) => s.userId)
  const name = useAuthStore((s) => s.name)
  const email = useAuthStore((s) => s.email)
  const role = useAuthStore((s) => s.role)
  const isGuest = useAuthStore((s) => s.isGuest)
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
            <p className="truncate text-sm text-ink-3">{isGuest ? 'Sin cuenta · datos solo en este teléfono' : email}</p>
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

      {userId && !isGuest && <MyCoachCard userId={userId} />}

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
            {/* El padding horizontal vive en este wrapper, no en el input: es
                el bug de WebKit documentado abajo — `-webkit-min-logical-
                width: 100%` (index.css) fuerza al input a medir 100% de SU
                caja, y si esa caja además tiene padding propio el resultado
                final se pasa por la derecha del padding hacia afuera. Con el
                input sin padding (100% = 100% de la caja completa), no
                sobra ni falta nada. */}
            <div className="h-11 overflow-hidden rounded-xs bg-surface-2 px-3 [color-scheme:dark] focus-within:ring-1 focus-within:ring-accent">
              <input
                type="date"
                value={profile.dob ?? ''}
                onChange={(e) => update({ dob: e.target.value || undefined })}
                className="h-full w-full bg-transparent outline-none"
              />
            </div>
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

      {/* Sesión. Un invitado no tiene sesión que cerrar (salir dejaría sus datos
          huérfanos): se le ofrece crear la cuenta. */}
      {isGuest ? (
        <button
          onClick={() => navigate('/registro')}
          className="flex h-14 w-full items-center justify-center rounded-md bg-accent px-4 font-bold text-bg active:bg-accent-dim"
        >
          Crear cuenta y respaldar mis datos
        </button>
      ) : (
        <button
          onClick={handleLogout}
          className="flex h-14 w-full items-center gap-3 rounded-md border border-danger/30 px-4 text-danger active:bg-danger/10"
        >
          <LogOut size={20} />
          <span className="font-semibold">Cerrar sesión</span>
        </button>
      )}

      <p className="text-center text-xs text-ink-3">
        Repe v1.0 ·{' '}
        {isGuest ? 'Tus datos viven solo en este teléfono' : 'Tus datos se respaldan en tu cuenta'}
      </p>
    </div>
  )
}
