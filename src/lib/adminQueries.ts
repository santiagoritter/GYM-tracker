import { supabase } from '@/lib/supabaseClient'

/**
 * Consultas del panel de admin: leen Supabase EN VIVO, protegidas por las
 * policies `*_admin_read` (ver supabase/migrations/0008_admin_rls_domain.sql
 * y el RPC `admin_list_users`). A diferencia del resto de la app, este
 * módulo NO pasa por Dexie ni por `src/db/scoped.ts` — no es data local del
 * dispositivo, es una vista cross-user que solo tiene sentido leída del
 * servidor. Excepción intencional al offline-first: esta pantalla requiere
 * conexión, y el rol de admin ya la protege (RLS solo deja pasar filas
 * ajenas si `app_metadata.role === 'admin'` en el JWT de quien pregunta).
 */

export interface AdminUser {
  id: string
  email: string
  createdAt: string
}

export interface AdminUserOverview {
  userId: string
  sessions: number
  totalVolumeKg: number
  lastWorkoutAt: string | null
}

export interface WeeklyPoint {
  /** Lunes de la semana, ISO (yyyy-mm-dd). */
  weekStart: string
  value: number
}

const DEFAULT_HISTORY_DAYS = 90

function weekStartIso(dateIso: string): string {
  const d = new Date(dateIso)
  const day = d.getUTCDay() // 0 = domingo
  const diff = (day + 6) % 7 // días desde el lunes
  d.setUTCDate(d.getUTCDate() - diff)
  d.setUTCHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

/** Lista de usuarios vía RPC `security definer` — nunca se lee `auth.users`
 * directo, esa tabla no tiene RLS normal aplicable desde el cliente. */
export async function fetchAdminUsers(): Promise<AdminUser[]> {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('admin_list_users')
  if (error) throw error
  return ((data ?? []) as { id: string; email: string; created_at: string }[]).map((u) => ({
    id: u.id,
    email: u.email,
    createdAt: u.created_at,
  }))
}

/** Sesiones, volumen total y último entreno por usuario. Agregado en el
 * cliente porque hoy el volumen de usuarios/filas es chico — si crece,
 * el siguiente paso es una vista SQL, no antes (no hace falta todavía). */
export async function fetchUsersOverview(): Promise<AdminUserOverview[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('workouts')
    .select('user_id, total_volume_kg, finished_at')
    .not('finished_at', 'is', null)
  if (error) throw error

  const byUser = new Map<string, AdminUserOverview>()
  for (const row of data ?? []) {
    const existing = byUser.get(row.user_id) ?? {
      userId: row.user_id,
      sessions: 0,
      totalVolumeKg: 0,
      lastWorkoutAt: null as string | null,
    }
    existing.sessions += 1
    existing.totalVolumeKg += row.total_volume_kg ?? 0
    if (!existing.lastWorkoutAt || row.finished_at > existing.lastWorkoutAt) {
      existing.lastWorkoutAt = row.finished_at
    }
    byUser.set(row.user_id, existing)
  }
  return [...byUser.values()].sort((a, b) => b.totalVolumeKg - a.totalVolumeKg)
}

/** Volumen semanal agregado de TODOS los usuarios, acotado a los últimos
 * `sinceDays` para no traer histórico sin límite. */
export async function fetchWeeklyVolume(sinceDays = DEFAULT_HISTORY_DAYS): Promise<WeeklyPoint[]> {
  if (!supabase) return []
  const since = new Date(Date.now() - sinceDays * 86_400_000).toISOString()
  const { data, error } = await supabase
    .from('workouts')
    .select('total_volume_kg, finished_at')
    .not('finished_at', 'is', null)
    .gte('finished_at', since)
  if (error) throw error

  const byWeek = new Map<string, number>()
  for (const row of data ?? []) {
    const week = weekStartIso(row.finished_at)
    byWeek.set(week, (byWeek.get(week) ?? 0) + (row.total_volume_kg ?? 0))
  }
  return [...byWeek.entries()]
    .map(([weekStart, value]) => ({ weekStart, value: Math.round(value) }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
}

/** PRs logrados por semana, todos los usuarios juntos. */
export async function fetchWeeklyPRs(sinceDays = DEFAULT_HISTORY_DAYS): Promise<WeeklyPoint[]> {
  if (!supabase) return []
  const since = new Date(Date.now() - sinceDays * 86_400_000).toISOString()
  const { data, error } = await supabase
    .from('personal_records')
    .select('achieved_at')
    .gte('achieved_at', since)
  if (error) throw error

  const byWeek = new Map<string, number>()
  for (const row of data ?? []) {
    const week = weekStartIso(row.achieved_at)
    byWeek.set(week, (byWeek.get(week) ?? 0) + 1)
  }
  return [...byWeek.entries()]
    .map(([weekStart, value]) => ({ weekStart, value }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
}
