import { supabase } from '@/lib/supabaseClient'
import { edgeErrorMessage } from '@/lib/coachSelfSignup'
import type { UserRole } from '@/types'

/**
 * Acciones de escritura del panel de admin sobre cuentas. TODO pasa por la
 * Edge Function `admin-users` (supabase/functions/admin-users), que corre con
 * la service_role key server-side y re-chequea que quien llama sea admin —
 * el cliente nunca toca `auth.admin.*` ni manda un `userId` para "decidir"
 * nada (CLAUDE.md §5). El JWT de sesión viaja solo, lo agrega supabase-js.
 */

export interface AdminUserDetail {
  id: string
  email: string
  createdAt: string
  lastSignInAt: string | null
  role: UserRole
  banned: boolean
}

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new Error('Supabase no está configurado.')
  const { data, error } = await supabase.functions.invoke('admin-users', { body })
  if (error) throw new Error(await edgeErrorMessage(error))
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error)
  return data as T
}

export function listUsersDetailed(): Promise<{ users: AdminUserDetail[] }> {
  return invoke({ action: 'list' })
}

export function setUserRole(userId: string, role: UserRole): Promise<{ ok: true }> {
  return invoke({ action: 'setRole', userId, role })
}

export function updateUserEmail(userId: string, email: string): Promise<{ ok: true }> {
  return invoke({ action: 'updateEmail', userId, email })
}

export function sendPasswordReset(email: string): Promise<{ ok: true }> {
  return invoke({ action: 'sendPasswordReset', email })
}

export function setUserBanned(userId: string, banned: boolean): Promise<{ ok: true }> {
  return invoke({ action: 'setBanned', userId, banned })
}

export function createUser(
  email: string,
  password: string,
  role: UserRole = 'user'
): Promise<{ ok: true; userId?: string }> {
  return invoke({ action: 'createUser', email, password, role })
}

export interface AuditRow {
  id: string
  actorId: string
  action: string
  targetUserId: string | null
  detail: Record<string, unknown>
  createdAt: string
}

/** Últimas acciones de admin. Lectura directa (RLS `admin_audit_admin_read`). */
export async function fetchAuditLog(limit = 50): Promise<AuditRow[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('admin_audit')
    .select('id, actor_id, action, target_user_id, detail, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []).map((r) => ({
    id: r.id,
    actorId: r.actor_id,
    action: r.action,
    targetUserId: r.target_user_id,
    detail: r.detail ?? {},
    createdAt: r.created_at,
  }))
}
