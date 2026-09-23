import { supabase } from '@/lib/supabaseClient'

/**
 * Reportar y bloquear (Guideline 1.2). Las tablas `reports` y `blocks` y la
 * RPC `block_user` viven en la migración 0017. `reportContent` SÍ manda
 * `reporter_id` en el insert (hace falta, es una columna de la fila) — lo
 * que no se puede es mentir con él: la policy `reports_insert_own`
 * (0017:141-143) tiene un `WITH CHECK (reporter_id = auth.uid())`, así que
 * el servidor rechaza cualquier insert que intente reportar en nombre de
 * otro. La identidad la sigue resolviendo el servidor, no el valor que
 * manda el cliente.
 */

export type ReportReason = 'spam' | 'abuse' | 'inappropriate' | 'impersonation' | 'other'
export type ReportKind = 'message' | 'review' | 'profile' | 'other'

export const REPORT_REASONS: { id: ReportReason; label: string }[] = [
  { id: 'abuse', label: 'Acoso o insultos' },
  { id: 'inappropriate', label: 'Contenido inapropiado' },
  { id: 'spam', label: 'Spam o publicidad' },
  { id: 'impersonation', label: 'Se hace pasar por otra persona' },
  { id: 'other', label: 'Otro motivo' },
]

export async function reportContent(input: {
  targetUserId: string | null
  kind: ReportKind
  targetRef?: string
  reason: ReportReason
  detail?: string
}): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado.')
  const { data: session } = await supabase.auth.getUser()
  const reporterId = session.user?.id
  if (!reporterId) throw new Error('Sin sesión.')
  const { error } = await supabase.from('reports').insert({
    reporter_id: reporterId,
    target_user_id: input.targetUserId,
    kind: input.kind,
    target_ref: input.targetRef ?? null,
    reason: input.reason,
    detail: input.detail?.trim().slice(0, 1000) || null,
  })
  if (error) throw error
}

/** Bloquea a un usuario (y termina el vínculo coach↔alumno entre ambos). */
export async function blockUser(targetId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado.')
  const { error } = await supabase.rpc('block_user', { target: targetId })
  if (error) throw new Error(error.message)
}

export async function unblockUser(targetId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado.')
  const { error } = await supabase.from('blocks').delete().eq('blocked_id', targetId)
  if (error) throw error
}

/** Ids de los usuarios que bloqueé. */
export async function fetchBlockedIds(): Promise<string[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('blocks').select('blocked_id')
  if (error) throw error
  return (data ?? []).map((r) => r.blocked_id as string)
}
