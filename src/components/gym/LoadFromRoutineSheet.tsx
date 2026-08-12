import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowLeft, X } from 'lucide-react'
import Portal from '@/components/ui/Portal'
import { useSheetDrag } from '@/hooks/useSheetDrag'
import {
  sheetItemVariants,
  sheetItemVariantsReduced,
  sheetPanelVariants,
  sheetPanelVariantsReduced,
} from '@/lib/motionVariants'
import { cn } from '@/lib/utils'
import type { Routine, RoutineDay } from '@/types'

/**
 * Dos pasos en un solo sheet: elegir rutina, después elegir día — para
 * cargar entrenamientos pasados por rutina en vez de ejercicio por
 * ejercicio (ver LogPastWorkout.tsx). Mismo criterio de escala que
 * RoutinePickerSheet: pocas rutinas, no hace falta buscador acá.
 */
export default function LoadFromRoutineSheet({
  routines,
  daysByRoutine,
  onSelectDay,
  onClose,
}: {
  routines: Routine[]
  daysByRoutine: Map<string, RoutineDay[]>
  onSelectDay: (day: RoutineDay) => void
  onClose: () => void
}) {
  const reduced = useReducedMotion()
  const { panelDragProps, handleDragProps } = useSheetDrag(onClose)
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null)

  const days = selectedRoutine ? daysByRoutine.get(selectedRoutine.id) ?? [] : []

  return (
    <Portal>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-glass-in" onClick={onClose} />

      <motion.div
        initial="hidden"
        animate="visible"
        variants={reduced ? sheetPanelVariantsReduced : sheetPanelVariants}
        {...panelDragProps}
        className="fixed bottom-0 left-1/2 z-50 flex max-h-[80vh] w-full max-w-lg flex-col rounded-t-3xl bg-surface shadow-float"
      >
        <motion.div variants={reduced ? sheetItemVariantsReduced : sheetItemVariants}>
          <div className="flex justify-center pt-3 pb-1" {...handleDragProps}>
            <div className="h-1 w-10 rounded-full bg-line-2" />
          </div>

          <div className="flex items-center justify-between px-5 pt-1 pb-3">
            <div className="flex min-w-0 items-center gap-1">
              {selectedRoutine && (
                <button
                  onClick={() => setSelectedRoutine(null)}
                  aria-label="Volver a rutinas"
                  className="flex h-9 w-9 shrink-0 items-center justify-center text-ink-2"
                >
                  <ArrowLeft size={18} />
                </button>
              )}
              <h2 className="min-w-0 truncate text-xl font-bold leading-tight">
                {selectedRoutine ? selectedRoutine.name : 'Elegí una rutina'}
              </h2>
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
          className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-5 pb-[calc(2rem+env(safe-area-inset-bottom))]"
        >
          {!selectedRoutine ? (
            routines.length === 0 ? (
              <p className="py-8 text-center text-[14px] text-ink-3">Todavía no tenés rutinas.</p>
            ) : (
              routines.map((routine) => {
                const routineDays = daysByRoutine.get(routine.id) ?? []
                return (
                  <button
                    key={routine.id}
                    onClick={() => setSelectedRoutine(routine)}
                    className="flex w-full items-center gap-3 rounded-xl bg-surface-2 px-4 py-3.5 text-left active:bg-surface-3"
                  >
                    <span
                      className="h-3.5 w-3.5 shrink-0 rounded-full"
                      style={{ backgroundColor: routine.color }}
                    />
                    <span className="min-w-0 flex-1 truncate font-semibold">{routine.name}</span>
                    <span className="shrink-0 text-[13px] text-ink-3">
                      {routineDays.length} {routineDays.length === 1 ? 'día' : 'días'}
                    </span>
                  </button>
                )
              })
            )
          ) : days.length === 0 ? (
            <p className="py-8 text-center text-[14px] text-ink-3">Esta rutina no tiene días.</p>
          ) : (
            days.map((day) => (
              <button
                key={day.id}
                onClick={() => day.isRest === 0 && onSelectDay(day)}
                disabled={day.isRest === 1}
                className={cn(
                  'flex w-full items-center justify-between rounded-xl bg-surface-2 px-4 py-3.5 text-left',
                  day.isRest === 1 ? 'opacity-50' : 'active:bg-surface-3'
                )}
              >
                <span className="min-w-0 flex-1 truncate font-semibold">{day.name}</span>
                {day.isRest === 1 && <span className="shrink-0 text-[13px] text-ink-3">descanso</span>}
              </button>
            ))
          )}
        </motion.div>
      </motion.div>
    </Portal>
  )
}
