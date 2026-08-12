import { useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Check, Search, X } from 'lucide-react'
import Portal from '@/components/ui/Portal'
import type { Exercise } from '@/types'
import { cn } from '@/lib/utils'
import {
  sheetItemVariants,
  sheetItemVariantsReduced,
  sheetPanelVariants,
  sheetPanelVariantsReduced,
} from '@/lib/motionVariants'

/**
 * Reemplazo del `<select>` nativo para elegir el ejercicio del gráfico en
 * Progreso — mismo patrón "Smooth Drawer" que RoutinePickerSheet.tsx en
 * vez del picker del sistema operativo, para que se sienta parte de la
 * misma app en vez de un control ajeno.
 */
export default function ExerciseSelectSheet({
  exercises,
  selectedId,
  onSelect,
  onClose,
}: {
  exercises: Exercise[]
  selectedId: string
  onSelect: (id: string) => void
  onClose: () => void
}) {
  const reduced = useReducedMotion()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return exercises
    return exercises.filter((e) => e.name.toLowerCase().includes(q))
  }, [exercises, query])

  return (
    <Portal>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-glass-in" onClick={onClose} />

      <motion.div
        initial="hidden"
        animate="visible"
        variants={reduced ? sheetPanelVariantsReduced : sheetPanelVariants}
        className="fixed bottom-0 left-1/2 z-50 flex max-h-[80vh] w-full max-w-lg flex-col rounded-t-3xl bg-surface shadow-float"
      >
        <motion.div variants={reduced ? sheetItemVariantsReduced : sheetItemVariants}>
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-line-2" />
          </div>

          <div className="flex items-center justify-between px-5 pt-1 pb-3">
            <h2 className="text-xl font-bold leading-tight">Elegir ejercicio</h2>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-fill text-ink-2 active:bg-fill-2"
            >
              <X size={16} />
            </button>
          </div>

          <div className="px-5 pb-3">
            <div className="flex h-11 items-center gap-2.5 rounded-sm bg-fill px-4">
              <Search size={16} className="shrink-0 text-ink-3" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar ejercicio…"
                className="w-full bg-transparent text-[15px] outline-none placeholder:text-ink-3"
              />
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={reduced ? sheetItemVariantsReduced : sheetItemVariants}
          className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-5 pb-[calc(2rem+env(safe-area-inset-bottom))]"
        >
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-[14px] text-ink-3">Sin resultados.</p>
          ) : (
            filtered.map((exercise) => (
              <button
                key={exercise.id}
                onClick={() => onSelect(exercise.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left active:bg-surface-3',
                  exercise.id === selectedId ? 'bg-accent/10 text-accent' : 'bg-surface-2'
                )}
              >
                <span className="min-w-0 flex-1 truncate font-semibold">{exercise.name}</span>
                {exercise.id === selectedId && <Check size={18} className="shrink-0" />}
              </button>
            ))
          )}
        </motion.div>
      </motion.div>
    </Portal>
  )
}
