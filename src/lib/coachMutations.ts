import { supabase } from '@/lib/supabaseClient'
import { nowIso, uid } from '@/lib/utils'
import type { QRPayload } from '@/lib/qr'
import type { Goal } from '@/lib/coachQueries'

/**
 * Escrituras del modo coach. Todo pasa por RLS: `coaches_self`,
 * `coach_invites_owner`, `coach_clients_*`, `client_goals_coach_writes` y
 * las policies `routines_coach`/`routine_days_coach`/`routine_exercises_coach`
 * (ver `supabase/migrations/0012_coach.sql`). El servidor resuelve la
 * identidad del `auth.uid()`; acá nunca se manda un id para "autorizar".
 */

export async function saveCoachProfile(input: {
  displayName: string
  bio: string
  experienceYears: number | null
  specialties?: string[]
}): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado.')
  const { data: session } = await supabase.auth.getUser()
  const id = session.user?.id
  if (!id) throw new Error('Sin sesión.')
  const { error } = await supabase.from('coaches').upsert({
    id,
    display_name: input.displayName.trim(),
    bio: input.bio.trim() || null,
    experience_years: input.experienceYears,
    specialties: input.specialties ?? [],
  })
  if (error) throw error
}

function randomCode(): string {
  // 8 caracteres sin ambigüedades (sin 0/O/1/I).
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  for (const b of bytes) out += alphabet[b % alphabet.length]
  return out
}

/** Crea (o reusa el más reciente vigente) un código de invitación del coach
 * que llama. Devuelve el código. */
export async function createInvite(expiresInDays = 30): Promise<string> {
  if (!supabase) throw new Error('Supabase no está configurado.')
  const { data: session } = await supabase.auth.getUser()
  const coachId = session.user?.id
  if (!coachId) throw new Error('Sin sesión.')
  const code = randomCode()
  const expiresAt = new Date(Date.now() + expiresInDays * 86_400_000).toISOString()
  const { error } = await supabase
    .from('coach_invites')
    .insert({ coach_id: coachId, code, expires_at: expiresAt })
  if (error) throw error
  return code
}

/** El alumno acepta un vínculo a partir de un código. */
export async function acceptInvite(code: string): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado.')
  const { data: session } = await supabase.auth.getUser()
  const clientId = session.user?.id
  if (!clientId) throw new Error('Sin sesión.')
  const { data: invite, error: iErr } = await supabase
    .from('coach_invites')
    .select('coach_id')
    .eq('code', code)
    .maybeSingle()
  if (iErr || !invite) throw new Error('Código inválido o vencido.')
  if (invite.coach_id === clientId) throw new Error('No podés ser tu propio coach.')
  const { error } = await supabase.from('coach_clients').upsert(
    {
      coach_id: invite.coach_id,
      client_id: clientId,
      status: 'active',
      invited_via: 'link',
      ended_at: null,
      ended_by: null,
    },
    { onConflict: 'coach_id,client_id' }
  )
  if (error) throw error
}

/** Corta el vínculo (cualquiera de las dos partes). */
export async function endBond(bondId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado.')
  const { data: session } = await supabase.auth.getUser()
  const { error } = await supabase
    .from('coach_clients')
    .update({ status: 'ended', ended_at: nowIso(), ended_by: session.user?.id ?? null })
    .eq('id', bondId)
  if (error) throw error
}

/**
 * Empuja una COPIA de una rutina (formato payload del QR) a las rutinas del
 * alumno. El alumno la posee (`user_id = clientId`) y la puede editar; queda
 * marcada con `source_coach_id`. Escribe directo en Supabase; el dispositivo
 * del alumno la baja en el próximo sync.
 */
export async function assignRoutineToClient(
  clientId: string,
  payload: QRPayload
): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado.')
  const { data: session } = await supabase.auth.getUser()
  const coachId = session.user?.id
  if (!coachId) throw new Error('Sin sesión.')

  const now = nowIso()
  const routineId = uid()
  const { error: rErr } = await supabase.from('routines').insert({
    id: routineId,
    user_id: clientId,
    name: payload.n,
    is_active: false,
    is_archived: false,
    source_coach_id: coachId,
    updated_at: now,
  })
  if (rErr) throw rErr

  const days = payload.d ?? []
  for (let di = 0; di < days.length; di++) {
    const d = days[di]
    const dayId = uid()
    const { error: dErr } = await supabase.from('routine_days').insert({
      id: dayId,
      user_id: clientId,
      routine_id: routineId,
      name: d.n,
      day_order: di,
      is_rest: Boolean(d.r),
      updated_at: now,
    })
    if (dErr) throw dErr

    const exercises = d.e ?? []
    for (let ei = 0; ei < exercises.length; ei++) {
      const e = exercises[ei]
      const { error: eErr } = await supabase.from('routine_exercises').insert({
        id: uid(),
        user_id: clientId,
        day_id: dayId,
        exercise_id: e.id,
        exercise_order: ei,
        sets_target: e.s,
        reps_min: e.r[0],
        reps_max: e.r[1],
        rest_seconds: e.rs ?? 90,
        notes: null,
        updated_at: now,
      })
      if (eErr) throw eErr
    }
  }
}

export async function setClientGoal(
  clientId: string,
  input: { title: string; metric: Goal['metric']; targetValue: number | null; dueDate: string | null }
): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado.')
  const { data: session } = await supabase.auth.getUser()
  const coachId = session.user?.id
  if (!coachId) throw new Error('Sin sesión.')
  const { error } = await supabase.from('client_goals').insert({
    coach_id: coachId,
    client_id: clientId,
    title: input.title.trim(),
    metric: input.metric,
    target_value: input.targetValue,
    due_date: input.dueDate,
  })
  if (error) throw error
}

export async function updateGoalStatus(goalId: string, status: Goal['status']): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado.')
  const { error } = await supabase.from('client_goals').update({ status }).eq('id', goalId)
  if (error) throw error
}
