import { supabase } from '@/lib/supabaseClient'
import type { ReportKind, ReportReason } from '@/lib/moderation'

/**
 * Bandeja de reportes del panel admin (Guideline 1.2). Lectura/escritura
 * directa contra `reports` con la RLS `reports_admin_all` (0017); borrar el
 * contenido reportado usa las policies de 0018. Suspender la cuenta va por
 * `setUserBanned` (Edge Function `admin-users`).
 */

export interface AdminReport {
  id: string
  reporterId: string
  targetUserId: string | null
  kind: ReportKind
  targetRef: string | null
  reason: ReportReason
  detail: string | null
  createdAt: string
  /** Texto del contenido reportado, si se pudo traer (mensaje o reseña). */
  content: string | null
}

export async function fetchOpenReports(limit = 100): Promise<AdminReport[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('reports')
    .select('id, reporter_id, target_user_id, kind, target_ref, reason, detail, created_at')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error

  return Promise.all(
    (data ?? []).map(async (r): Promise<AdminReport> => {
      let content: string | null = null
      if (r.kind === 'message' && r.target_ref) {
        const { data: m } = await supabase!
          .from('coach_messages')
          .select('body')
          .eq('id', r.target_ref)
          .maybeSingle()
        content = m?.body ?? null
      } else if (r.kind === 'message' && r.target_user_id) {
        // Reporte de la conversación (sin mensaje puntual): los últimos del
        // reportado, para tener contexto.
        const { data: ms } = await supabase!
          .from('coach_messages')
          .select('body')
          .eq('sender_id', r.target_user_id)
          .order('created_at', { ascending: false })
          .limit(3)
        content = (ms ?? []).map((m) => m.body).filter(Boolean).join('\n— ') || null
      } else if (r.kind === 'review' && r.target_ref) {
        const { data: rv } = await supabase!
          .from('coach_reviews')
          .select('comment')
          .eq('id', r.target_ref)
          .maybeSingle()
        content = rv?.comment ?? null
      }
      return {
        id: r.id,
        reporterId: r.reporter_id,
        targetUserId: r.target_user_id,
        kind: r.kind,
        targetRef: r.target_ref,
        reason: r.reason,
        detail: r.detail,
        createdAt: r.created_at,
        content,
      }
    })
  )
}

export async function resolveReport(
  reportId: string,
  status: 'actioned' | 'dismissed'
): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado.')
  const { data: session } = await supabase.auth.getUser()
  const { error } = await supabase
    .from('reports')
    .update({ status, resolved_by: session.user?.id ?? null, resolved_at: new Date().toISOString() })
    .eq('id', reportId)
  if (error) throw error
}

/** Borra el mensaje o la reseña reportados (solo admin, policies de 0018). */
export async function deleteReportedContent(report: AdminReport): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado.')
  if (!report.targetRef) throw new Error('Este reporte no apunta a un contenido puntual.')
  const table = report.kind === 'message' ? 'coach_messages' : report.kind === 'review' ? 'coach_reviews' : null
  if (!table) throw new Error('Este tipo de reporte no tiene contenido para borrar.')
  const { error } = await supabase.from(table).delete().eq('id', report.targetRef)
  if (error) throw error
}
