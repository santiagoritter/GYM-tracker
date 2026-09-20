import { supabase } from '@/lib/supabaseClient'
import { draftToRpcPayload, type RoutineDraft } from '@/lib/coachRoutineDraft'
import { nowIso } from '@/lib/utils'
import type { Goal } from '@/lib/coachQueries'

/**
 * Escrituras del modo coach. Todo pasa por RLS: `coaches_self`,
 * `coach_invites_owner`, `coach_clients_*` y `client_goals_coach_writes`
 * (0012); las rutinas del alumno se escriben solo por las RPC de 0021. El servidor resuelve la
 * identidad del `auth.uid()`; acá nunca se manda un id para "autorizar".
 */

export async function saveCoachProfile(input: {
  displayName: string
  bio: string
  experienceYears: number | null
  specialties: string[]
  location: string
  certifications: string
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
    specialties: input.specialties,
    location: input.location.trim() || null,
    certifications: input.certifications.trim() || null,
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

/** El alumno acepta un vínculo a partir de un código. Va por una RPC
 * (`accept_coach_invite`, migración 0016): valida código, vencimiento y usos, y
 * crea o reactiva el vínculo. Ya no se escribe `coach_clients` directo. */
export async function acceptInvite(code: string): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado.')
  const { error } = await supabase.rpc('accept_coach_invite', { invite_code: code })
  if (error) throw new Error(error.message)
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
 * Crea o edita una rutina para un alumno, en una sola transacción del lado del
 * servidor (`coach_upsert_routine`, migración 0021). `routineId = null` crea;
 * con un id edita una rutina que ESTE coach ya le asignó. El alumno la posee
 * (`user_id = alumno`) y la baja en su próximo sync. Devuelve el id.
 */
export async function saveCoachRoutine(
  clientId: string,
  routineId: string | null,
  draft: RoutineDraft
): Promise<string> {
  if (!supabase) throw new Error('Supabase no está configurado.')
  const { data, error } = await supabase.rpc('coach_upsert_routine', {
    p_client: clientId,
    p_routine_id: routineId,
    p_payload: draftToRpcPayload(draft),
  })
  if (error) throw new Error(error.message)
  return data as string
}

/** Retira (borra para el alumno) una rutina que este coach le asignó. */
export async function retireCoachRoutine(clientId: string, routineId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado.')
  const { error } = await supabase.rpc('coach_retire_routine', {
    p_client: clientId,
    p_routine_id: routineId,
  })
  if (error) throw new Error(error.message)
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

/** ¿Habilité que mi coach vea mis calorías? (`client_sharing`, migración 0020). */
export async function fetchMyShareCalories(): Promise<boolean> {
  if (!supabase) return false
  const { data: session } = await supabase.auth.getUser()
  const id = session.user?.id
  if (!id) return false
  const { data } = await supabase
    .from('client_sharing')
    .select('share_calories')
    .eq('client_id', id)
    .maybeSingle()
  return data?.share_calories === true
}

/** El alumno decide si su coach ve sus calorías. Solo escribe su propia fila. */
export async function setShareCalories(share: boolean): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado.')
  const { data: session } = await supabase.auth.getUser()
  const id = session.user?.id
  if (!id) throw new Error('Sin sesión.')
  const { error } = await supabase
    .from('client_sharing')
    .upsert({ client_id: id, share_calories: share, updated_at: new Date().toISOString() })
  if (error) throw error
}
