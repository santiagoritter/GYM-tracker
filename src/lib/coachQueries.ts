import { supabase } from '@/lib/supabaseClient'

/**
 * Lecturas del modo coach — TODO en vivo contra Supabase (como
 * `adminQueries.ts`), no Dexie: son datos cross-user que solo tienen
 * sentido leídos del servidor, protegidos por las policies `*_coach_read`
 * y el helper `is_coach_of()` de `supabase/migrations/0012_coach.sql`.
 */

export interface ClientSummary {
  clientId: string
  displayName: string | null
  email: string
  bondedAt: string
}

export interface ClientOverview {
  sessions: number
  totalVolumeKg: number
  lastWorkoutAt: string | null
  prs: number
}

export interface ClientRoutine {
  id: string
  name: string
  isActive: boolean
  sourceCoachId: string | null
}

export interface Goal {
  id: string
  coachId: string
  clientId: string
  title: string
  metric: 'weight_1rm' | 'bodyweight' | 'sessions_per_week' | 'custom'
  targetValue: number | null
  dueDate: string | null
  status: 'active' | 'done' | 'dropped'
  createdAt: string
}

export interface CoachPublic {
  coachId: string
  displayName: string | null
  bio: string | null
  experienceYears: number | null
  verified: boolean
}

/** Alumnos activos del coach que llama (RPC `security definer`). */
export async function fetchMyClients(): Promise<ClientSummary[]> {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('coach_client_summaries')
  if (error) throw error
  return ((data ?? []) as { client_id: string; display_name: string | null; email: string; bonded_at: string }[]).map(
    (r) => ({ clientId: r.client_id, displayName: r.display_name, email: r.email, bondedAt: r.bonded_at })
  )
}

export async function fetchClientOverview(clientId: string): Promise<ClientOverview> {
  const empty: ClientOverview = { sessions: 0, totalVolumeKg: 0, lastWorkoutAt: null, prs: 0 }
  if (!supabase) return empty
  const [{ data: workouts, error: wErr }, { count: prCount, error: pErr }] = await Promise.all([
    supabase
      .from('workouts')
      .select('total_volume_kg, finished_at')
      .eq('user_id', clientId)
      .not('finished_at', 'is', null),
    supabase.from('personal_records').select('id', { count: 'exact', head: true }).eq('user_id', clientId),
  ])
  if (wErr) throw wErr
  if (pErr) throw pErr
  let totalVolumeKg = 0
  let lastWorkoutAt: string | null = null
  for (const w of workouts ?? []) {
    totalVolumeKg += w.total_volume_kg ?? 0
    if (!lastWorkoutAt || w.finished_at > lastWorkoutAt) lastWorkoutAt = w.finished_at
  }
  return { sessions: workouts?.length ?? 0, totalVolumeKg: Math.round(totalVolumeKg), lastWorkoutAt, prs: prCount ?? 0 }
}

/** id de la fila `coach_clients` activa entre el coach que llama y este alumno. */
export async function fetchBondId(clientId: string): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase
    .from('coach_clients')
    .select('id')
    .eq('client_id', clientId)
    .eq('status', 'active')
    .maybeSingle()
  return data?.id ?? null
}

export async function fetchClientRoutines(clientId: string): Promise<ClientRoutine[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('routines')
    .select('id, name, is_active, is_archived, source_coach_id')
    .eq('user_id', clientId)
    .eq('is_archived', false)
  if (error) throw error
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    isActive: r.is_active,
    sourceCoachId: r.source_coach_id,
  }))
}

function mapGoal(r: Record<string, unknown>): Goal {
  return {
    id: r.id as string,
    coachId: r.coach_id as string,
    clientId: r.client_id as string,
    title: r.title as string,
    metric: r.metric as Goal['metric'],
    targetValue: (r.target_value as number | null) ?? null,
    dueDate: (r.due_date as string | null) ?? null,
    status: r.status as Goal['status'],
    createdAt: r.created_at as string,
  }
}

export async function fetchClientGoals(clientId: string): Promise<Goal[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('client_goals')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(mapGoal)
}

/** Metas del alumno que llama (para mostrarlas en su propia pantalla de Progreso). */
export async function fetchMyGoals(userId: string): Promise<Goal[]> {
  return fetchClientGoals(userId)
}

/** El coach del alumno que llama, o `null` si no tiene vínculo activo. */
export async function fetchMyCoach(
  userId: string
): Promise<(CoachPublic & { bondId: string }) | null> {
  if (!supabase) return null
  const { data: bond, error } = await supabase
    .from('coach_clients')
    .select('id, coach_id')
    .eq('client_id', userId)
    .eq('status', 'active')
    .maybeSingle()
  if (error || !bond) return null
  const { data: coach } = await supabase
    .from('coaches')
    .select('id, display_name, bio, experience_years, verified')
    .eq('id', bond.coach_id)
    .maybeSingle()
  return {
    bondId: bond.id,
    coachId: bond.coach_id,
    displayName: coach?.display_name ?? null,
    bio: coach?.bio ?? null,
    experienceYears: coach?.experience_years ?? null,
    verified: coach?.verified ?? false,
  }
}

/** Previsualización de un coach a partir de un código de invitación. */
export async function fetchInvitePreview(code: string): Promise<CoachPublic | null> {
  if (!supabase) return null
  const { data: invite } = await supabase
    .from('coach_invites')
    .select('coach_id')
    .eq('code', code)
    .maybeSingle()
  if (!invite) return null
  const { data: coach } = await supabase
    .from('coaches')
    .select('id, display_name, bio, experience_years, verified')
    .eq('id', invite.coach_id)
    .maybeSingle()
  if (!coach) return null
  return {
    coachId: coach.id,
    displayName: coach.display_name,
    bio: coach.bio,
    experienceYears: coach.experience_years,
    verified: coach.verified,
  }
}

/** La ficha de coach del usuario que llama (para el onboarding/edición). */
export async function fetchMyCoachProfile(userId: string): Promise<{
  displayName: string
  bio: string
  experienceYears: number | null
  verified: boolean
} | null> {
  if (!supabase) return null
  const { data } = await supabase
    .from('coaches')
    .select('display_name, bio, experience_years, verified')
    .eq('id', userId)
    .maybeSingle()
  if (!data) return null
  return {
    displayName: data.display_name ?? '',
    bio: data.bio ?? '',
    experienceYears: data.experience_years ?? null,
    verified: data.verified ?? false,
  }
}
