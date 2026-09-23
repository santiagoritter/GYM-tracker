import { supabase } from '@/lib/supabaseClient'
import type { RoutineDraft } from '@/lib/coachRoutineDraft'
import type { RosterClient } from '@/lib/coachRoster'
import { uid } from '@/lib/utils'

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
  specialties: string[]
  location: string | null
  certifications: string | null
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

/** Tablero de alumnos (desktop): todo en una sola RPC (`coach_roster`,
 * 0025) en vez de una consulta por alumno — con 30-50 alumnos eso eran
 * igual de round-trips. La agregación/orden/filtro es pura y vive en
 * coachRoster.ts (testeada aparte, sin red). */
export async function fetchCoachRoster(): Promise<RosterClient[]> {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('coach_roster')
  if (error) throw error
  return (
    (data ?? []) as {
      client_id: string
      display_name: string | null
      email: string
      bonded_at: string
      weekly_goal: number | null
      last_workout_at: string | null
      workouts_7d: number
      prs_7d: number
      unread: number
    }[]
  ).map((r) => ({
    clientId: r.client_id,
    displayName: r.display_name,
    email: r.email,
    bondedAt: r.bonded_at,
    weeklyGoal: r.weekly_goal,
    lastWorkoutAt: r.last_workout_at,
    workouts7d: r.workouts_7d,
    prs7d: r.prs_7d,
    unread: r.unread,
  }))
}

export async function fetchClientOverview(clientId: string): Promise<ClientOverview> {
  const empty: ClientOverview = { sessions: 0, totalVolumeKg: 0, lastWorkoutAt: null, prs: 0 }
  if (!supabase) return empty
  const [{ data: workouts, error: wErr }, { count: prCount, error: pErr }] = await Promise.all([
    supabase
      .from('workouts')
      .select('total_volume_kg, finished_at')
      .eq('user_id', clientId)
      .is('deleted_at', null)
      .not('finished_at', 'is', null),
    supabase
      .from('personal_records')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', clientId)
      .is('deleted_at', null),
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
  const { data, error } = await supabase
    .from('coach_clients')
    .select('id')
    .eq('client_id', clientId)
    .eq('status', 'active')
    .maybeSingle()
  if (error) throw error
  return data?.id ?? null
}

export async function fetchClientRoutines(clientId: string): Promise<ClientRoutine[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('routines')
    .select('id, name, is_active, is_archived, source_coach_id')
    .eq('user_id', clientId)
    .eq('is_archived', false)
    .is('deleted_at', null)
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
    .select('id, display_name, bio, experience_years, verified, specialties, location, certifications')
    .eq('id', bond.coach_id)
    .maybeSingle()
  return {
    bondId: bond.id,
    coachId: bond.coach_id,
    displayName: coach?.display_name ?? null,
    bio: coach?.bio ?? null,
    experienceYears: coach?.experience_years ?? null,
    verified: coach?.verified ?? false,
    specialties: coach?.specialties ?? [],
    location: coach?.location ?? null,
    certifications: coach?.certifications ?? null,
  }
}

/** Previsualización de un coach a partir de un código de invitación. */
export async function fetchInvitePreview(code: string): Promise<CoachPublic | null> {
  if (!supabase) return null
  // RPC `get_invite_preview` (migración 0016): solo devuelve la ficha pública
  // del coach dueño de un código vigente; la tabla de invitaciones no se lee.
  const { data, error } = await supabase.rpc('get_invite_preview', { invite_code: code })
  if (error) throw error
  const coach = (data ?? [])[0] as
    | {
        coach_id: string
        display_name: string | null
        bio: string | null
        experience_years: number | null
        verified: boolean
        specialties: string[] | null
        location: string | null
        certifications: string | null
      }
    | undefined
  if (!coach) return null
  return {
    coachId: coach.coach_id,
    displayName: coach.display_name,
    bio: coach.bio,
    experienceYears: coach.experience_years,
    verified: coach.verified,
    specialties: coach.specialties ?? [],
    location: coach.location,
    certifications: coach.certifications,
  }
}

/** La ficha de coach del usuario que llama (para el onboarding/edición). */
export async function fetchMyCoachProfile(userId: string): Promise<{
  displayName: string
  bio: string
  experienceYears: number | null
  verified: boolean
  specialties: string[]
  location: string
  certifications: string
} | null> {
  if (!supabase) return null
  // Antes no chequeaba `error`: un fallo de red también da `data: null`,
  // así que un coach ya dado de alta se veía como "coach nuevo" (form
  // vacío) — y guardar ese form vacío pisaba la bio/especialidades reales.
  const { data, error } = await supabase
    .from('coaches')
    .select('display_name, bio, experience_years, verified, specialties, location, certifications')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    displayName: data.display_name ?? '',
    bio: data.bio ?? '',
    experienceYears: data.experience_years ?? null,
    verified: data.verified ?? false,
    specialties: data.specialties ?? [],
    location: data.location ?? '',
    certifications: data.certifications ?? '',
  }
}

/**
 * Una rutina del alumno como borrador editable (con los ids del servidor, para
 * que guardar edite en vez de duplicar). Solo sirve para las que asignó este
 * coach: la RPC de guardado lo vuelve a verificar del lado del servidor.
 */
export async function fetchClientRoutineDraft(
  clientId: string,
  routineId: string
): Promise<RoutineDraft | null> {
  if (!supabase) return null
  const { data: routine, error } = await supabase
    .from('routines')
    .select('id, name, source_coach_id')
    .eq('id', routineId)
    .eq('user_id', clientId)
    .is('deleted_at', null)
    .maybeSingle()
  if (error) throw error
  if (!routine) return null

  const { data: days, error: dErr } = await supabase
    .from('routine_days')
    .select('id, name, day_order, is_rest')
    .eq('routine_id', routineId)
    .eq('user_id', clientId)
    .is('deleted_at', null)
    .order('day_order', { ascending: true })
  if (dErr) throw dErr

  const dayIds = (days ?? []).map((d) => d.id as string)
  const { data: exercises, error: eErr } = dayIds.length
    ? await supabase
        .from('routine_exercises')
        .select(
          'id, day_id, exercise_id, exercise_order, sets_target, reps_min, reps_max, rest_seconds, notes, superset_group'
        )
        .eq('user_id', clientId)
        .in('day_id', dayIds)
        .is('deleted_at', null)
        .order('exercise_order', { ascending: true })
    : { data: [], error: null }
  if (eErr) throw eErr

  return {
    name: routine.name as string,
    days: (days ?? []).map((d) => ({
      key: uid(),
      id: d.id as string,
      name: d.name as string,
      isRest: Boolean(d.is_rest),
      exercises: (exercises ?? [])
        .filter((e) => e.day_id === d.id)
        .map((e) => ({
          key: uid(),
          id: e.id as string,
          exerciseId: e.exercise_id as string,
          sets: e.sets_target as number,
          repsMin: e.reps_min as number,
          repsMax: e.reps_max as number,
          restSeconds: e.rest_seconds as number,
          notes: (e.notes as string | null) ?? '',
          supersetGroup: (e.superset_group as number | null) ?? undefined,
        })),
    })),
  }
}
