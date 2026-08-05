import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Plus, X } from 'lucide-react'
import Portal from '@/components/ui/Portal'
import { db } from '@/db/schema'
import { nowIso, uid } from '@/lib/utils'
import { toast } from '@/stores/toastStore'
import { useKeyboardInset } from '@/hooks/useKeyboardInset'
import {
  sheetItemVariants,
  sheetItemVariantsReduced,
  sheetPanelVariants,
  sheetPanelVariantsReduced,
} from '@/lib/motionVariants'

/**
 * Fase 36 — "Smooth Drawer" (kokonutui) adaptado al patrón de sheet ya
 * establecido (Portal + motion.div, igual que TemplatePicker/
 * ExerciseDetailSheet), no al Drawer de shadcn del ejemplo. Reemplaza la
 * sección "Agregar" que antes vivía siempre visible e inline en
 * Calories.tsx — mismos inputs, mismo guardado, solo cambia el
 * contenedor.
 */
export default function CalorieAddSheet({
  userId,
  onClose,
}: {
  userId: string
  onClose: () => void
}) {
  const [kcalInput, setKcalInput] = useState('')
  const [labelInput, setLabelInput] = useState('')
  const reduced = useReducedMotion()
  const keyboardInset = useKeyboardInset()

  const handleAdd = async () => {
    const kcal = Number(kcalInput)
    if (!kcal || kcal <= 0) {
      toast.error('Ingresá un valor válido', 'Las calorías tienen que ser un número mayor a 0.')
      return
    }
    await db.calorieEntries.add({
      id: uid(),
      userId,
      loggedAt: nowIso(),
      kcal,
      label: labelInput.trim() || undefined,
      dirty: 1,
      updatedAt: nowIso(),
    })
    onClose()
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-50 bg-bg/80 backdrop-blur-sm animate-glass-in" onClick={onClose} />

      <motion.div
        initial="hidden"
        animate="visible"
        variants={reduced ? sheetPanelVariantsReduced : sheetPanelVariants}
        className="fixed bottom-0 left-1/2 z-50 w-full max-w-lg rounded-t-3xl bg-surface shadow-float"
      >
        <motion.div variants={reduced ? sheetItemVariantsReduced : sheetItemVariants}>
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-line-2" />
          </div>

          <div className="flex items-start justify-between px-5 pt-1 pb-3">
            <h2 className="text-xl font-bold leading-tight">Agregar calorías</h2>
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
          className="space-y-3 px-5"
          style={{
            // Con el teclado abierto, el margen de home indicator
            // (safe-area-inset-bottom) queda tapado y no sirve — el borde
            // real de abajo pasa a ser el propio teclado. Se reemplaza por
            // el alto del teclado + el mismo respiro de siempre, así el
            // botón sube y queda justo arriba en vez de escondido detrás.
            paddingBottom:
              keyboardInset > 0
                ? `${keyboardInset + 24}px`
                : 'calc(1.5rem + env(safe-area-inset-bottom))',
          }}
        >
          <div className="flex gap-2">
            <input
              type="number"
              inputMode="numeric"
              autoFocus
              value={kcalInput}
              onChange={(e) => setKcalInput(e.target.value)}
              placeholder="kcal"
              className="h-11 w-24 rounded-xs bg-surface-2 px-3 text-center font-mono tabular-nums outline-none focus:ring-1 focus:ring-accent"
            />
            <input
              type="text"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              placeholder="Almuerzo (opcional)"
              className="h-11 min-w-0 flex-1 rounded-xs bg-surface-2 px-3 text-[15px] outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <button
            onClick={handleAdd}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xs bg-accent font-bold text-bg active:bg-accent-dim"
          >
            <Plus size={18} /> Agregar
          </button>
        </motion.div>
      </motion.div>
    </Portal>
  )
}
