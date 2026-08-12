import { motion, useReducedMotion } from 'motion/react'
import { Play, X } from 'lucide-react'
import ResponsiveSheet from '@/components/ui/ResponsiveSheet'
import { useSheetDrag } from '@/hooks/useSheetDrag'
import { sheetItemVariants, sheetItemVariantsReduced } from '@/lib/motionVariants'
import { cn } from '@/lib/utils'
import type { Routine, RoutineDay } from '@/types'

/**
 * Antes esta lista vivía siempre desplegada al final de Inicio — ocupaba
 * lugar permanente por algo que se consulta una vez por sesión ("¿qué día
 * toca?"). Ahora es un sheet: el botón que la abre sí queda fijo, la
 * lista no.
 */
export default function RoutineDaysSheet({
  routine,
  days,
  onStartDay,
  onClose,
}: {
  routine: Routine
  days: RoutineDay[]
  onStartDay: (dayId: string) => void
  onClose: () => void
}) {
  const reduced = useReducedMotion()
  const { panelDragProps, handleDragProps } = useSheetDrag(onClose)

  return (
    <ResponsiveSheet onClose={onClose} dragProps={panelDragProps}>
      <motion.div variants={reduced ? sheetItemVariantsReduced : sheetItemVariants}>
          <div className="flex justify-center pt-3 pb-1" {...handleDragProps}>
            <div className="h-1 w-10 rounded-full bg-line-2" />
          </div>

          <div className="flex items-center justify-between px-5 pt-1 pb-3">
            <div className="flex items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: routine.color }}
                aria-hidden="true"
              />
              <h2 className="text-lg font-bold leading-tight">{routine.name}</h2>
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
          className="space-y-1 px-3 pb-[calc(1rem+env(safe-area-inset-bottom))]"
        >
          {days.map((day) => (
            <div
              key={day.id}
              className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5"
            >
              <span
                className={cn(
                  'min-w-0 flex-1 truncate text-[15px]',
                  day.isRest === 1 && 'text-ink-3'
                )}
              >
                {day.name}
                {day.isRest === 1 && ' · descanso'}
              </span>
              {day.isRest === 0 && (
                <button
                  onClick={() => onStartDay(day.id)}
                  className="flex h-9 shrink-0 items-center gap-1.5 rounded-xs bg-accent px-3 text-[13px] font-bold text-bg active:bg-accent-dim"
                >
                  <Play size={13} fill="currentColor" /> Entrenar
                </button>
              )}
            </div>
          ))}
        </motion.div>
    </ResponsiveSheet>
  )
}
