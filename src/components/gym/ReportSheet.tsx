import { useState } from 'react'
import { X } from 'lucide-react'
import {
  blockUser,
  reportContent,
  REPORT_REASONS,
  type ReportKind,
  type ReportReason,
} from '@/lib/moderation'
import { toast } from '@/stores/toastStore'
import ResponsiveSheet from '@/components/ui/ResponsiveSheet'
import { cn } from '@/lib/utils'

/**
 * Reportar contenido o a un usuario, y/o bloquearlo (Guideline 1.2). Lo usan
 * el chat, la tarjeta de "Tu coach" y las reseñas. Bloquear termina el vínculo
 * coach↔alumno entre ambos y oculta lo que esa persona escriba.
 */
export default function ReportSheet({
  targetUserId,
  targetName,
  kind,
  targetRef,
  allowBlock = true,
  onClose,
  onBlocked,
}: {
  targetUserId: string
  targetName: string
  kind: ReportKind
  targetRef?: string
  allowBlock?: boolean
  onClose: () => void
  onBlocked?: () => void
}) {
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [detail, setDetail] = useState('')
  const [busy, setBusy] = useState(false)

  const sendReport = async () => {
    if (!reason || busy) return
    setBusy(true)
    try {
      await reportContent({ targetUserId, kind, targetRef, reason, detail })
      toast.success('Reporte enviado', 'Lo revisamos y actuamos si corresponde.')
      onClose()
    } catch (e) {
      toast.error('No se pudo enviar', e instanceof Error ? e.message : 'Probá de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  const block = async () => {
    if (busy) return
    if (!confirm(`¿Bloquear a ${targetName}? Se termina el vínculo y no vas a ver más sus mensajes.`)) return
    setBusy(true)
    try {
      await blockUser(targetUserId)
      toast.success('Usuario bloqueado')
      onBlocked?.()
      onClose()
    } catch (e) {
      toast.error('No se pudo bloquear', e instanceof Error ? e.message : 'Probá de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ResponsiveSheet onClose={onClose} panelClassName="flex max-h-[88vh] flex-col">
      <div className="flex items-start justify-between px-5 pt-4 pb-2">
        <div>
          <h2 className="text-lg font-bold">Reportar o bloquear</h2>
          <p className="mt-0.5 text-[13px] text-ink-2">{targetName}</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-fill text-ink-2 active:bg-fill-2"
        >
          <X size={16} />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-2">
        <div>
          <p className="mb-2 text-sm font-medium text-ink-2">¿Qué pasó?</p>
          <div className="space-y-1.5">
            {REPORT_REASONS.map((r) => (
              <button
                key={r.id}
                onClick={() => setReason(r.id)}
                className={cn(
                  'flex h-11 w-full items-center rounded-sm px-4 text-left text-[15px]',
                  reason === r.id ? 'bg-accent text-bg font-semibold' : 'bg-surface-2 text-ink'
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <textarea
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="Contanos más (opcional)"
          className="w-full rounded-sm bg-surface-2 p-4 text-[15px] outline-none focus:ring-1 focus:ring-accent"
        />
        <p className="text-[12px] text-ink-3">
          Los reportes los revisa el equipo. Si es una emergencia, contactá a las autoridades de tu zona.
        </p>
      </div>

      <div className="space-y-2 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2">
        <button
          onClick={sendReport}
          disabled={!reason || busy}
          className="h-12 w-full rounded-sm bg-accent text-sm font-bold text-bg disabled:opacity-40"
        >
          {busy ? 'Enviando…' : 'Enviar reporte'}
        </button>
        {allowBlock && (
          <button
            onClick={block}
            disabled={busy}
            className="h-12 w-full rounded-sm border border-danger/40 bg-danger/10 text-sm font-bold text-danger active:bg-danger/20 disabled:opacity-40"
          >
            Bloquear a {targetName}
          </button>
        )}
      </div>
    </ResponsiveSheet>
  )
}
