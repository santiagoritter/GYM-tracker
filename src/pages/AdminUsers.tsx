import { useCallback, useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { KeyRound, ShieldBan, ShieldCheck, UserPlus, Users, WifiOff } from 'lucide-react'
import {
  fetchUsersOverview,
  fetchWeeklyPRs,
  fetchWeeklyVolume,
  type AdminUserOverview,
  type WeeklyPoint,
} from '@/lib/adminQueries'
import {
  createUser,
  fetchAuditLog,
  listUsersDetailed,
  sendPasswordReset,
  setUserBanned,
  setUserRole,
  type AdminUserDetail,
  type AuditRow,
} from '@/lib/adminMutations'
import type { UserRole } from '@/types'
import { supabase } from '@/lib/supabaseClient'
import { useChartColors } from '@/hooks/useChartColors'
import { toast } from '@/stores/toastStore'
import { Card, EmptyState, Row, SectionHeader } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

const ACTIVE_WINDOW_DAYS = 30

export default function AdminUsers() {
  const chartColors = useChartColors()
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | {
        status: 'ok'
        users: AdminUserDetail[]
        overview: Map<string, AdminUserOverview>
        weeklyVolume: WeeklyPoint[]
        weeklyPRs: WeeklyPoint[]
      }
  >({ status: 'loading' })
  const [audit, setAudit] = useState<AuditRow[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState<UserRole>('user')

  const load = useCallback(() => {
    if (!supabase) return
    setState({ status: 'loading' })
    Promise.all([listUsersDetailed(), fetchUsersOverview(), fetchWeeklyVolume(), fetchWeeklyPRs()])
      .then(([usersRes, overviewList, weeklyVolume, weeklyPRs]) => {
        setState({
          status: 'ok',
          users: usersRes.users,
          overview: new Map(overviewList.map((o) => [o.userId, o])),
          weeklyVolume,
          weeklyPRs,
        })
      })
      .catch((err: unknown) =>
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : 'No se pudieron cargar los datos.',
        })
      )
    fetchAuditLog().then(setAudit).catch(() => setAudit([]))
  }, [])

  useEffect(load, [load])

  const runAction = async (id: string, fn: () => Promise<unknown>, okMsg: string) => {
    setBusyId(id)
    try {
      await fn()
      toast.success(okMsg)
      load()
    } catch (err) {
      toast.error('No se pudo', err instanceof Error ? err.message : 'Error.')
    } finally {
      setBusyId(null)
    }
  }

  const handleCreate = async () => {
    setBusyId('__create__')
    try {
      await createUser(newEmail.trim(), newPassword, newRole)
      toast.success('Usuario creado', newEmail.trim())
      setNewEmail('')
      setNewPassword('')
      setNewRole('user')
      setShowCreate(false)
      load()
    } catch (err) {
      toast.error('No se pudo crear', err instanceof Error ? err.message : 'Error.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mx-auto content-width space-y-6 lg:max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent/15">
          <Users size={20} className="text-accent" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Usuarios</h1>
          <p className="text-xs text-ink-3">Gestión y actividad de todas las cuentas, en vivo</p>
        </div>
      </div>

      {!supabase ? (
        <EmptyState
          icon={<WifiOff size={28} />}
          title="Supabase no está configurado"
          description="Esta vista necesita conexión al backend — no funciona en modo local."
        />
      ) : state.status === 'loading' ? (
        <p className="py-12 text-center text-sm text-ink-3">Cargando…</p>
      ) : state.status === 'error' ? (
        <EmptyState icon={<WifiOff size={28} />} title="No se pudo cargar" description={state.message} />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <StatBlock label="Usuarios" value={String(state.users.length)} />
            <StatBlock
              label={`Activos (${ACTIVE_WINDOW_DAYS}d)`}
              value={String(
                [...state.overview.values()].filter(
                  (o) =>
                    o.lastWorkoutAt &&
                    Date.now() - new Date(o.lastWorkoutAt).getTime() < ACTIVE_WINDOW_DAYS * 86_400_000
                ).length
              )}
            />
            <StatBlock
              label="Coaches"
              value={String(state.users.filter((u) => u.role === 'coach').length)}
            />
          </div>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <SectionHeader title="Cuentas" />
              <button
                onClick={() => setShowCreate((s) => !s)}
                className="flex items-center gap-1.5 text-[13px] font-semibold text-accent"
              >
                <UserPlus size={15} /> Crear
              </button>
            </div>

            {showCreate && (
              <Card className="mb-2 space-y-2 p-3">
                <input
                  type="email"
                  placeholder="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="h-11 w-full rounded-sm bg-surface-2 px-3 text-[15px] outline-none focus:ring-1 focus:ring-accent"
                />
                <input
                  type="text"
                  placeholder="contraseña (8+)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-11 w-full rounded-sm bg-surface-2 px-3 text-[15px] outline-none focus:ring-1 focus:ring-accent"
                />
                <div className="flex gap-2">
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="h-11 flex-1 rounded-sm bg-surface-2 px-3 text-[15px]"
                  >
                    <option value="user">user</option>
                    <option value="coach">coach</option>
                    <option value="admin">admin</option>
                  </select>
                  <button
                    onClick={handleCreate}
                    disabled={busyId === '__create__' || !newEmail.trim() || newPassword.length < 8}
                    className="h-11 rounded-sm bg-accent px-4 text-sm font-bold text-bg disabled:opacity-50"
                  >
                    Crear
                  </button>
                </div>
              </Card>
            )}

            <Card>
              {state.users.map((user) => {
                const o = state.overview.get(user.id)
                const busy = busyId === user.id
                return (
                  <Row key={user.id} className={cn('flex-col items-stretch gap-2', busy && 'opacity-50')}>
                    <div className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-medium">
                          {user.email}
                          {user.banned && <span className="ml-2 text-[12px] text-danger">deshabilitada</span>}
                        </p>
                        <p className="text-[12px] text-ink-3">
                          {o?.sessions ?? 0} entrenos · {Math.round((o?.totalVolumeKg ?? 0) / 1000)}t
                          {user.lastSignInAt &&
                            ` · último acceso ${new Date(user.lastSignInAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}`}
                        </p>
                      </div>
                      <select
                        value={user.role}
                        disabled={busy}
                        onChange={(e) =>
                          runAction(user.id, () => setUserRole(user.id, e.target.value as UserRole), 'Rol actualizado')
                        }
                        className="h-9 shrink-0 rounded-sm bg-surface-2 px-2 text-[13px]"
                      >
                        <option value="user">user</option>
                        <option value="coach">coach</option>
                        <option value="admin">admin</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          runAction(user.id, () => sendPasswordReset(user.email), 'Email de reset enviado')
                        }
                        disabled={busy}
                        className="flex h-9 items-center gap-1.5 rounded-sm bg-fill px-3 text-[12px] font-semibold text-ink-2 active:bg-fill-2"
                      >
                        <KeyRound size={13} /> Reset
                      </button>
                      <button
                        onClick={() =>
                          runAction(
                            user.id,
                            () => setUserBanned(user.id, !user.banned),
                            user.banned ? 'Cuenta reactivada' : 'Cuenta deshabilitada'
                          )
                        }
                        disabled={busy}
                        className="flex h-9 items-center gap-1.5 rounded-sm bg-fill px-3 text-[12px] font-semibold text-ink-2 active:bg-fill-2"
                      >
                        {user.banned ? <ShieldCheck size={13} /> : <ShieldBan size={13} />}
                        {user.banned ? 'Reactivar' : 'Deshabilitar'}
                      </button>
                    </div>
                  </Row>
                )
              })}
            </Card>
          </section>

          <div className="lg:grid lg:grid-cols-2 lg:gap-6">
            <section>
              <SectionHeader title="Volumen semanal, todos (kg)" />
              <div className="h-48 rounded-xl bg-surface p-3">
                {state.weeklyVolume.length === 0 ? (
                  <p className="flex h-full items-center justify-center text-sm text-ink-3">
                    Sin entrenos en los últimos 90 días.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={state.weeklyVolume} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                      <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="weekStart" stroke={chartColors.axis} fontSize={10} />
                      <YAxis stroke={chartColors.axis} fontSize={11} />
                      <Tooltip
                        cursor={{ fill: chartColors.cursor }}
                        contentStyle={{
                          backgroundColor: chartColors.tooltipBg,
                          border: `1px solid ${chartColors.tooltipBorder}`,
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        labelStyle={{ color: chartColors.tooltipText }}
                        formatter={(value) => [`${value} kg`, 'Volumen']}
                      />
                      <Bar dataKey="value" fill={chartColors.accent} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            <section>
              <SectionHeader title="PRs por semana, todos" />
              <div className="h-48 rounded-xl bg-surface p-3">
                {state.weeklyPRs.length === 0 ? (
                  <p className="flex h-full items-center justify-center text-sm text-ink-3">
                    Sin PRs en los últimos 90 días.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={state.weeklyPRs} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                      <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="weekStart" stroke={chartColors.axis} fontSize={10} />
                      <YAxis stroke={chartColors.axis} fontSize={11} allowDecimals={false} />
                      <Tooltip
                        cursor={{ fill: chartColors.cursor }}
                        contentStyle={{
                          backgroundColor: chartColors.tooltipBg,
                          border: `1px solid ${chartColors.tooltipBorder}`,
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        labelStyle={{ color: chartColors.tooltipText }}
                        formatter={(value) => [`${value}`, 'PRs']}
                      />
                      <Bar dataKey="value" fill={chartColors.info} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>
          </div>

          {audit.length > 0 && (
            <section>
              <SectionHeader title="Registro de acciones" />
              <Card>
                {audit.map((a) => (
                  <Row key={a.id}>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px]">
                        <span className="font-semibold">{a.action}</span>
                        {a.detail.email ? ` · ${String(a.detail.email)}` : ''}
                        {a.detail.role ? ` → ${String(a.detail.role)}` : ''}
                      </p>
                      <p className="text-[12px] text-ink-3">
                        {new Date(a.createdAt).toLocaleString('es-AR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </Row>
                ))}
              </Card>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-surface p-3 text-center">
      <p className="font-mono text-xl font-bold tabular-nums text-accent">{value}</p>
      <p className="mt-0.5 text-[11px] text-ink-3">{label}</p>
    </div>
  )
}
