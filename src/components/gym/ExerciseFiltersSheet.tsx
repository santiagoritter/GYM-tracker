import { motion, useReducedMotion } from 'motion/react'
import { X } from 'lucide-react'
import type { Equipment, MuscleGroup } from '@/types'
import { MUSCLE_LABELS } from '@/components/gym/MuscleChip'
import ResponsiveSheet from '@/components/ui/ResponsiveSheet'
import { useSheetDrag } from '@/hooks/useSheetDrag'
import { EQUIPMENT_FILTERS, EQUIPMENT_LABELS, MUSCLE_FILTERS } from '@/lib/exerciseFilters'
import { sheetItemVariants, sheetItemVariantsReduced } from '@/lib/motionVariants'
import { cn } from '@/lib/utils'

/**
 * Antes: dos filas de pills (12 de músculo + 8 de equipo) siempre
 * visibles arriba de Exercises.tsx, ocupando ~25% del viewport en
 * 393px antes de llegar a un solo ejercicio. Se mudan acá — mismo
 * patrón de sheet que TemplatePicker.tsx — para que la pantalla
 * arranque con contenido, no con controles.
 */
export default function ExerciseFiltersSheet({
  muscle,
  equipment,
  resultCount,
  onMuscleChange,
  onEquipmentChange,
  onClose,
}: {
  muscle: MuscleGroup | null
  equipment: Equipment | null
  resultCount: number
  onMuscleChange: (m: MuscleGroup | null) => void
  onEquipmentChange: (e: Equipment | null) => void
  onClose: () => void
}) {
  const reduced = useReducedMotion()
  const { panelDragProps, handleDragProps } = useSheetDrag(onClose)
  const hasFilters = muscle !== null || equipment !== null

  return (
    <ResponsiveSheet
      onClose={onClose}
      dragProps={panelDragProps}
      panelClassName="flex max-h-[85vh] flex-col"
    >
      <motion.div variants={reduced ? sheetItemVariantsReduced : sheetItemVariants}>
          <div className="flex justify-center pt-3 pb-1" {...handleDragProps}>
            <div className="h-1 w-10 rounded-full bg-line-2" />
          </div>

          <div className="flex items-start justify-between px-5 pt-1 pb-3">
            <h2 className="text-xl font-bold leading-tight">Filtros</h2>
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
          className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 pb-4"
        >
          <div>
            <h3 className="mb-2 text-sm font-semibold text-ink-2">Músculo</h3>
            <div className="flex flex-wrap gap-2">
              {MUSCLE_FILTERS.map((m) => (
                <button
                  key={m}
                  onClick={() => onMuscleChange(muscle === m ? null : m)}
                  className={cn(
                    'flex h-10 shrink-0 items-center whitespace-nowrap rounded-full px-3.5 text-[13px] font-medium transition-colors',
                    muscle === m ? 'bg-accent text-bg' : 'bg-fill text-ink-2 active:bg-fill-2'
                  )}
                >
                  {MUSCLE_LABELS[m]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-ink-2">Equipo</h3>
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT_FILTERS.map((eq) => (
                <button
                  key={eq}
                  onClick={() => onEquipmentChange(equipment === eq ? null : eq)}
                  className={cn(
                    'flex h-10 shrink-0 items-center whitespace-nowrap rounded-full px-3.5 text-[13px] font-medium transition-colors',
                    equipment === eq ? 'bg-info text-white' : 'bg-fill text-ink-2 active:bg-fill-2'
                  )}
                >
                  {EQUIPMENT_LABELS[eq]}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={reduced ? sheetItemVariantsReduced : sheetItemVariants}
          className="flex gap-2 border-t border-line-2 px-5 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]"
        >
          <button
            onClick={() => {
              onMuscleChange(null)
              onEquipmentChange(null)
            }}
            disabled={!hasFilters}
            className="h-12 shrink-0 rounded-sm border border-line-2 px-4 font-semibold text-ink-2 active:bg-surface-2 disabled:opacity-40"
          >
            Limpiar
          </button>
          <button
            onClick={onClose}
            className="h-12 flex-1 rounded-sm bg-accent font-bold text-bg active:bg-accent-dim"
          >
            Ver {resultCount} {resultCount === 1 ? 'ejercicio' : 'ejercicios'}
          </button>
        </motion.div>
    </ResponsiveSheet>
  )
}
