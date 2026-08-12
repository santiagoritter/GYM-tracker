import { useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Search, X } from 'lucide-react'
import ResponsiveSheet from '@/components/ui/ResponsiveSheet'
import { useSheetDrag } from '@/hooks/useSheetDrag'
import type { Routine, RoutineDay } from '@/types'
import { sheetItemVariants, sheetItemVariantsReduced } from '@/lib/motionVariants'

/**
 * Reemplazo del scrubber alfabético estilo Contactos de iOS que se había
 * pedido originalmente para "no tener que ir dando vueltas" entre
 * rutinas — descartado en conjunto con el usuario: las rutinas se
 * nombran libre (sin orden alfabético con sentido) y son pocas (2-6
 * típico), un índice A-Z no tendría casi nada que indexar. Esto resuelve
 * lo mismo con una hoja simple: buscar y tocar cualquiera para saltar
 * directo a esa posición en el mazo, sin dar vueltas con "Cambiar
 * rutina" (que solo avanza de a una).
 *
 * Deliberadamente sin las acciones de compartir/favorita/eliminar que ya
 * tiene el reverso de cada carta del mazo — este picker es solo "buscar
 * y saltar", no una segunda superficie de gestión.
 */
export default function RoutinePickerSheet({
  routines,
  daysByRoutine,
  onSelect,
  onClose,
}: {
  routines: Routine[]
  daysByRoutine: Map<string, RoutineDay[]>
  onSelect: (routine: Routine) => void
  onClose: () => void
}) {
  const reduced = useReducedMotion()
  const { panelDragProps, handleDragProps } = useSheetDrag(onClose)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return routines
    return routines.filter((r) => r.name.toLowerCase().includes(q))
  }, [routines, query])

  return (
    <ResponsiveSheet
      onClose={onClose}
      dragProps={panelDragProps}
      panelClassName="flex max-h-[80vh] flex-col"
    >
      <motion.div variants={reduced ? sheetItemVariantsReduced : sheetItemVariants}>
          <div className="flex justify-center pt-3 pb-1" {...handleDragProps}>
            <div className="h-1 w-10 rounded-full bg-line-2" />
          </div>

          <div className="flex items-center justify-between px-5 pt-1 pb-3">
            <h2 className="text-xl font-bold leading-tight">Buscar rutina</h2>
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
                placeholder="Nombre de la rutina…"
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
            filtered.map((routine) => {
              const days = daysByRoutine.get(routine.id) ?? []
              return (
                <button
                  key={routine.id}
                  onClick={() => onSelect(routine)}
                  className="flex w-full items-center gap-3 rounded-xl bg-surface-2 px-4 py-3.5 text-left active:bg-surface-3"
                >
                  <span
                    className="h-3.5 w-3.5 shrink-0 rounded-full"
                    style={{ backgroundColor: routine.color }}
                  />
                  <span className="min-w-0 flex-1 truncate font-semibold">{routine.name}</span>
                  <span className="shrink-0 text-[13px] text-ink-3">
                    {days.length} {days.length === 1 ? 'día' : 'días'}
                  </span>
                </button>
              )
            })
          )}
        </motion.div>
    </ResponsiveSheet>
  )
}
