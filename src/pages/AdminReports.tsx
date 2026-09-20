import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Flag } from 'lucide-react'
import {
  deleteReportedContent,
  fetchOpenReports,
  resolveReport,
  type AdminReport,
} from '@/lib/adminReports'
import { listUsersDetailed, setUserBanned } from '@/lib/adminMutations'
import { REPORT_REASONS } from '@/lib/moderation'
import { toast } from '@/stores/toastStore'
import { Card, EmptyState } from '@/components/ui/Card'

/**
 * Bandeja de reportes de usuarios (chat, reseñas, perfiles). Por cada reporte:
 * descartar, borrar el contenido puntual (si lo hay) o suspender la cuenta del
 * reportado — y en los dos últimos casos queda marcado como resuelto.
 */
export default function AdminReports() {
  const navigate = useNavigate()
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ok'; reports: AdminReport[]; emails: Map<string, string> }
  >({ status: 'loading' })
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(() => {
    setState({ status: 'loading' })
    Promise.all([fetchOpenReports(), listUsersDetailed()])
      .then(([reports, { users }]) =>
        setState({ status: 'ok', reports, emails: new Map(users.map((u) => [u.id, u.email])) })
      )
      .catch((e) =>
        setState({ status: 'error', message: e instanceof Error ? e.message : 'No se pudo cargar.' })
      )
  }, [])

  useEffect(load, [load])

  const act = async (report: AdminReport, action: 'dismiss' | 'delete' | 'ban') => {
    if (action === 'ban' && !confirm('¿Suspender la cuenta del usuario reportado?')) return
    if (action === 'delete' && !confirm('¿Borrar el contenido reportado?')) return
    setBusyId(report.id)
    try {
      if (action === 'delete') await deleteReportedContent(report)
      if (action === 'ban') {
        if (!report.targetUserId) throw new Error('El reporte no tiene un usuario asociado.')
        await setUserBanned(report.targetUserId, true)
      }
      await resolveReport(report.id, action === 'dismiss' ? 'dismissed' : 'actioned')
      toast.success(action === 'dismiss' ? 'Reporte descartado' : 'Reporte resuelto')
      load()
    } catch (e) {
      toast.error('No se pudo', e instanceof Error ? e.message : 'Error')
    } finally {
      setBusyId(null)
    }
  }

  const reasonLabel = (id: string) => REPORT_REASONS.find((r) => r.id === id)?.label ?? id

  return (
    <div className="mx-auto content-width space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/admin')}
          aria-label="Volver"
          className="-ml-2 flex h-11 w-11 items-center justify-center text-ink-2"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-xl font-bold">Reportes</h1>
      </div>

      {state.status === 'loading' && <p className="py-12 text-center text-sm text-ink-3">Cargando…</p>}
      {state.status === 'error' && (
        <p className="rounded-sm bg-danger/10 p-3 text-sm text-danger">{state.message}</p>
      )}
      {state.status === 'ok' && state.reports.length === 0 && (
        <EmptyState
          icon={<Flag size={26} className="text-ink-3" />}
          title="Sin reportes abiertos"
          description="Cuando alguien reporte un mensaje, una reseña o un perfil, aparece acá."
        />
      )}
      {state.status === 'ok' &&
        state.reports.map((r) => (
          <Card key={r.id} className="space-y-2 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold">{reasonLabel(r.reason)}</p>
              <p className="shrink-0 text-[12px] text-ink-3">
                {new Date(r.createdAt).toLocaleDateString('es-AR')}
              </p>
            </div>
            <p className="text-[13px] text-ink-3">
              Reportó: {state.emails.get(r.reporterId) ?? r.reporterId.slice(0, 8)} · Contra:{' '}
              {r.targetUserId ? (state.emails.get(r.targetUserId) ?? r.targetUserId.slice(0, 8)) : '—'} · {r.kind}
            </p>
            {r.detail && <p className="text-[14px] text-ink-2">"{r.detail}"</p>}
            {r.content && (
              <p className="whitespace-pre-wrap rounded-sm bg-surface-2 p-3 text-[14px] text-ink">{r.content}</p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={() => act(r, 'dismiss')}
                disabled={busyId === r.id}
                className="h-11 rounded-sm bg-fill px-4 text-sm font-semibold text-ink-2 disabled:opacity-40"
              >
                Descartar
              </button>
              {r.targetRef && r.kind !== 'profile' && r.kind !== 'other' && (
                <button
                  onClick={() => act(r, 'delete')}
                  disabled={busyId === r.id}
                  className="h-11 rounded-sm bg-fill px-4 text-sm font-semibold text-ink disabled:opacity-40"
                >
                  Borrar contenido
                </button>
              )}
              {r.targetUserId && (
                <button
                  onClick={() => act(r, 'ban')}
                  disabled={busyId === r.id}
                  className="h-11 rounded-sm border border-danger/40 bg-danger/10 px-4 text-sm font-semibold text-danger disabled:opacity-40"
                >
                  Suspender cuenta
                </button>
              )}
            </div>
          </Card>
        ))}
    </div>
  )
}
