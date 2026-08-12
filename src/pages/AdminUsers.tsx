import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Users, WifiOff } from 'lucide-react'
import {
  fetchAdminUsers,
  fetchUsersOverview,
  fetchWeeklyPRs,
  fetchWeeklyVolume,
  type AdminUser,
  type AdminUserOverview,
  type WeeklyPoint,
} from '@/lib/adminQueries'
import { supabase } from '@/lib/supabaseClient'
import { useChartColors } from '@/hooks/useChartColors'
import { Card, EmptyState, Row, SectionHeader } from '@/components/ui/Card'

/**
 * Panel de admin sobre TODOS los usuarios — a diferencia de Admin.tsx (que
 * son stats locales del propio dispositivo), esto lee Supabase en vivo vía
 * `src/lib/adminQueries.ts`, protegido por las policies `*_admin_read`
 * (ver supabase/migrations/0008_admin_rls_domain.sql). Requiere conexión:
 * es la única pantalla de la app que no funciona offline, a propósito.
 */
export default function AdminUsers() {
  const chartColors = useChartColors()
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | {
        status: 'ok'
        users: AdminUser[]
        overview: Map<string, AdminUserOverview>
        weeklyVolume: WeeklyPoint[]
        weeklyPRs: WeeklyPoint[]
      }
  >({ status: 'loading' })

  useEffect(() => {
    if (!supabase) return
    let cancelled = false
    setState({ status: 'loading' })
    Promise.all([fetchAdminUsers(), fetchUsersOverview(), fetchWeeklyVolume(), fetchWeeklyPRs()])
      .then(([users, overviewList, weeklyVolume, weeklyPRs]) => {
        if (cancelled) return
        const overview = new Map(overviewList.map((o) => [o.userId, o]))
        setState({ status: 'ok', users, overview, weeklyVolume, weeklyPRs })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : 'No se pudieron cargar los datos.',
        })
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto content-width space-y-6 lg:max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent/15">
          <Users size={20} className="text-accent" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Usuarios</h1>
          <p className="text-xs text-ink-3">Actividad de todos los usuarios, en vivo</p>
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
        <EmptyState
          icon={<WifiOff size={28} />}
          title="No se pudo cargar"
          description={state.message}
        />
      ) : state.users.length === 0 ? (
        <EmptyState
          icon={<Users size={28} />}
          title="Sin usuarios todavía"
          description="Cuando haya cuentas registradas, van a aparecer acá."
        />
      ) : (
        <div className="space-y-6 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
          <section className="lg:col-span-2">
            <SectionHeader title="Usuarios" />
            <Card>
              {state.users.map((user) => {
                const overview = state.overview.get(user.id)
                return (
                  <Row key={user.id}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium">{user.email}</p>
                      <p className="text-[13px] text-ink-3">
                        {overview?.sessions ?? 0} entrenos ·{' '}
                        {Math.round((overview?.totalVolumeKg ?? 0) / 1000)}t
                        {overview?.lastWorkoutAt &&
                          ` · último el ${new Date(overview.lastWorkoutAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}`}
                      </p>
                    </div>
                  </Row>
                )
              })}
            </Card>
          </section>

          <section>
            <SectionHeader title="Volumen semanal, todos los usuarios (kg)" />
            <div className="h-48 rounded-xl bg-surface p-3">
              {state.weeklyVolume.length === 0 ? (
                <p className="flex h-full items-center justify-center text-sm text-ink-3">
                  Sin entrenos en los últimos 90 días.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={state.weeklyVolume}
                    margin={{ top: 8, right: 8, bottom: 0, left: -20 }}
                  >
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
            <SectionHeader title="PRs logrados por semana" />
            <div className="h-48 rounded-xl bg-surface p-3">
              {state.weeklyPRs.length === 0 ? (
                <p className="flex h-full items-center justify-center text-sm text-ink-3">
                  Sin PRs en los últimos 90 días.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={state.weeklyPRs}
                    margin={{ top: 8, right: 8, bottom: 0, left: -20 }}
                  >
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
      )}
    </div>
  )
}
