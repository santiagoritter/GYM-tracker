import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { X, CalendarDays, Download } from 'lucide-react'
import ResponsiveSheet from '@/components/ui/ResponsiveSheet'
import { useSheetDrag } from '@/hooks/useSheetDrag'
import { ROUTINE_TEMPLATES, type RoutineTemplate } from '@/data/routineTemplates'
import { importPayload } from '@/lib/qr'
import { toast } from '@/stores/toastStore'
import { sheetItemVariants, sheetItemVariantsReduced } from '@/lib/motionVariants'
import { cn } from '@/lib/utils'

const LEVEL_COLOR: Record<RoutineTemplate['level'], string> = {
  Principiante: 'text-success',
  Intermedio: 'text-warning',
  Avanzado: 'text-danger',
}

export default function TemplatePicker({
  userId,
  onClose,
  onImported,
}: {
  userId: string
  onClose: () => void
  onImported: (routineId: string) => void
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const reduced = useReducedMotion()
  const { panelDragProps, handleDragProps } = useSheetDrag(onClose)

  const handleImport = async (template: RoutineTemplate) => {
    setBusy(template.id)
    try {
      const { routineId, skipped } = await importPayload(userId, template.payload, template.name)
      toast.success(
        `${template.name} importada`,
        skipped > 0
          ? `${skipped} ejercicio(s) no están en el catálogo y se omitieron.`
          : 'Ya podés editarla o marcarla como favorita.'
      )
      onImported(routineId)
    } catch {
      toast.error('No se pudo importar', 'Intentá de nuevo.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <ResponsiveSheet
      onClose={onClose}
      dragProps={panelDragProps}
      panelClassName="flex max-h-[88vh] flex-col"
    >
      <motion.div variants={reduced ? sheetItemVariantsReduced : sheetItemVariants}>
          <div className="flex justify-center pt-3 pb-1" {...handleDragProps}>
            <div className="h-1 w-10 rounded-full bg-line-2" />
          </div>

          <div className="flex items-start justify-between px-5 pt-1 pb-3">
            <div className="pr-4">
              <h2 className="text-xl font-bold leading-tight">Rutinas clásicas</h2>
              <p className="mt-0.5 text-[13px] text-ink-2">
                Importá una y editala como quieras. Los pesos los calcula la app.
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-fill text-ink-2 active:bg-fill-2"
            >
              <X size={16} />
            </button>
          </div>
        </motion.div>

        <motion.div
          variants={reduced ? sheetItemVariantsReduced : sheetItemVariants}
          className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-5 pb-[calc(2rem+env(safe-area-inset-bottom))]"
        >
          {ROUTINE_TEMPLATES.map((t) => (
            <div key={t.id} className="rounded-2xl bg-surface-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold leading-tight">{t.name}</h3>
                  <p className="mt-0.5 text-[13px] text-ink-2">{t.subtitle}</p>
                </div>
                <span className={cn('shrink-0 text-[11px] font-bold uppercase', LEVEL_COLOR[t.level])}>
                  {t.level}
                </span>
              </div>

              <p className="mt-2.5 text-[13px] leading-relaxed text-ink-2">{t.description}</p>

              <div className="mt-3 flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-[12px] font-medium text-ink-3">
                  <CalendarDays size={14} />
                  {t.daysPerWeek} días/semana
                </span>
                <span className="text-[12px] text-ink-3">
                  {t.payload.d.filter((d) => !d.r).length} sesiones
                </span>
              </div>

              <button
                onClick={() => handleImport(t)}
                disabled={busy !== null}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-[15px] font-bold text-bg active:bg-accent-dim disabled:opacity-40"
              >
                <Download size={16} />
                {busy === t.id ? 'Importando…' : 'Importar esta rutina'}
              </button>
            </div>
          ))}
        </motion.div>
    </ResponsiveSheet>
  )
}
