import { motion, useReducedMotion } from 'motion/react'
import { X, type LucideIcon } from 'lucide-react'
import ResponsiveSheet from '@/components/ui/ResponsiveSheet'
import { useSheetDrag } from '@/hooks/useSheetDrag'
import { sheetItemVariants, sheetItemVariantsReduced } from '@/lib/motionVariants'
import { cn } from '@/lib/utils'

export interface PickerOption<K extends string> {
  key: K
  label: string
  desc?: string
  Icon?: LucideIcon
}

/**
 * Sheet genérico de lista con selección única — un toque elige y cierra.
 * Usado desde Ajustes para nivel y objetivo (`LEVEL_OPTIONS`/`GOAL_OPTIONS`
 * de `strengthStandards.ts`), sin la ceremonia de pasos de Onboarding.
 * Mismo esqueleto que `ExerciseFiltersSheet.tsx`/`RoutinePickerSheet.tsx`.
 */
export default function OptionPickerSheet<K extends string>({
  title,
  options,
  value,
  onSelect,
  onClose,
}: {
  title: string
  options: PickerOption<K>[]
  value?: K
  onSelect: (key: K) => void
  onClose: () => void
}) {
  const reduced = useReducedMotion()
  const { panelDragProps, handleDragProps } = useSheetDrag(onClose)

  return (
    <ResponsiveSheet onClose={onClose} dragProps={panelDragProps} panelClassName="flex max-h-[80vh] flex-col">
      <motion.div variants={reduced ? sheetItemVariantsReduced : sheetItemVariants}>
        <div className="flex justify-center pt-3 pb-1" {...handleDragProps}>
          <div className="h-1 w-10 rounded-full bg-line-2" />
        </div>
        <div className="flex items-center justify-between px-5 pt-1 pb-3">
          <h2 className="text-xl font-bold leading-tight">{title}</h2>
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
        className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-5 pb-[calc(1rem+env(safe-area-inset-bottom))]"
      >
        {options.map(({ key, label, desc, Icon }) => (
          <button
            key={key}
            onClick={() => {
              onSelect(key)
              onClose()
            }}
            className={cn(
              'flex w-full items-center gap-3 rounded-md border p-4 text-left transition-colors',
              value === key ? 'border-accent bg-accent/10' : 'border-line-2'
            )}
          >
            {Icon && <Icon size={20} strokeWidth={1.8} className={value === key ? 'text-accent' : 'text-ink-3'} />}
            <div className="min-w-0 flex-1">
              <p className={cn('font-semibold', value === key ? 'text-accent' : 'text-ink')}>{label}</p>
              {desc && <p className="text-sm text-ink-3">{desc}</p>}
            </div>
          </button>
        ))}
      </motion.div>
    </ResponsiveSheet>
  )
}
