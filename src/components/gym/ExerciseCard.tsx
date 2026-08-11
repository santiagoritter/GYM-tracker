import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Check, CopyCheck } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { MuscleChip } from '@/components/gym/MuscleChip'
import NumberStepper from '@/components/ui/NumberStepper'
import type { Exercise, WorkoutSet } from '@/types'
import { cn, displayToKg, formatWeight } from '@/lib/utils'
import { WEIGHT_INCREMENT, isBodyweight } from '@/lib/loading'

const SPRING = { type: 'spring' as const, damping: 30, stiffness: 300 }
// Alto del header solo (nombre + badge SS + contador x/y) cuando la tarjeta
// está colapsada — constante, no medida: mismo criterio que ya usa
// `RoutineStackCard.FRONT_HEIGHT` para su cara "de mazo" (no seleccionada).
const COLLAPSED_HEIGHT = 56

export interface ExerciseCardProps {
  exercise: Exercise | undefined
  sets: WorkoutSet[]
  units: 'kg' | 'lbs'
  isSuperset: boolean
  expanded: boolean
  onExpand: () => void
  editingSetId: string | null
  onEditSet: (id: string) => void
  onCompleteSet: (s: WorkoutSet) => void
  onUpdateSet: (id: string, patch: Partial<WorkoutSet>) => void
  onAddSet: () => void
  onRemoveSet: () => void
  onEqualizeSets: () => void
}

/**
 * Tarjeta de un ejercicio dentro del entreno activo. Colapsada muestra solo
 * el header (nombre + contador); expandida, todo lo demás (chips de
 * músculo, grilla de series, footer). El contenido completo está SIEMPRE
 * montado — nunca se desmonta para animar, solo se clippea con
 * `overflow-hidden` + un alto animado — porque `motion` no puede
 * interpolar hacia `'auto'`. El alto colapsado es una constante (como
 * `RoutineStackCard.FRONT_HEIGHT`); el expandido se mide en vivo con
 * `ResizeObserver` sobre el contenido completo, que siempre incluye el
 * header (así nunca hace falta reconciliar dos mediciones separadas).
 */
export default function ExerciseCard({
  exercise,
  sets,
  units,
  isSuperset,
  expanded,
  onExpand,
  editingSetId,
  onEditSet,
  onCompleteSet,
  onUpdateSet,
  onAddSet,
  onRemoveSet,
  onEqualizeSets,
}: ExerciseCardProps) {
  const reduced = useReducedMotion()
  const contentRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const [fullHeight, setFullHeight] = useState<number>()

  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    const measure = () => setFullHeight(el.getBoundingClientRect().height)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [sets.length])

  // `inert` saca el contenido colapsado del tab-order y de los toques —
  // fallback de `aria-hidden` en la propia clase JSX porque `inert` no está
  // tipado en @types/react instalado; el DOM real sí lo soporta.
  useEffect(() => {
    const el = bodyRef.current
    if (el) el.inert = !expanded
  }, [expanded])

  const completedCount = sets.filter((s) => s.completed === 1).length

  return (
    <Card as="section" className="overflow-hidden px-3 pb-0">
      <motion.div
        initial={false}
        animate={reduced ? undefined : { height: expanded ? fullHeight : COLLAPSED_HEIGHT }}
        transition={reduced ? { duration: 0 } : SPRING}
        style={reduced ? { height: expanded ? undefined : COLLAPSED_HEIGHT } : undefined}
        className="overflow-hidden"
      >
        <div ref={contentRef}>
          {expanded ? (
            // Sin h-14 acá: tiene que crecer lo que haga falta para los
            // chips de músculo — el h-14 fijo es solo para la versión
            // colapsada de una sola línea, de abajo.
            <div className="flex items-start justify-between gap-3 border-b border-line-2 px-1 py-3.5">
              <ExerciseHeaderContent exercise={exercise} isSuperset={isSuperset} showChips />
              <ExerciseCounter completed={completedCount} total={sets.length} />
            </div>
          ) : (
            <button
              type="button"
              onClick={onExpand}
              aria-expanded={false}
              aria-label={`Expandir ${exercise?.name ?? 'ejercicio'}`}
              className="flex h-14 w-full items-center justify-between gap-3 border-b border-line-2 px-1 py-3.5 text-left"
            >
              <ExerciseHeaderContent exercise={exercise} isSuperset={isSuperset} showChips={false} />
              <ExerciseCounter completed={completedCount} total={sets.length} />
            </button>
          )}

          <div ref={bodyRef} aria-hidden={!expanded}>
            <div className="grid grid-cols-[2rem_1fr_1fr_3.5rem] gap-2 px-1 pb-1 pt-2.5 text-[12px] font-medium text-ink-3">
              <span>#</span>
              <span className="text-center">Reps</span>
              <span className="text-center">
                {exercise && isBodyweight(exercise.equipment) ? 'Lastre' : units}
              </span>
              <span />
            </div>

            {sets.map((s) => (
              <SetRow
                key={s.id}
                set={s}
                equipment={exercise?.equipment ?? 'other'}
                units={units}
                isActive={s.id === sets.find((x) => x.completed === 0)?.id}
                expanded={
                  editingSetId === s.id ||
                  (editingSetId === null && s.id === sets.find((x) => x.completed === 0)?.id)
                }
                onExpand={() => onEditSet(s.id)}
                onComplete={() => onCompleteSet(s)}
                onUpdate={(patch) => onUpdateSet(s.id, patch)}
              />
            ))}

            <div className="mb-3 mt-2 flex gap-2">
              <button
                onClick={onAddSet}
                className="h-11 flex-1 rounded-sm bg-surface-2 text-sm font-medium text-ink-2 transition-colors active:bg-surface-3"
              >
                Agregar serie
              </button>
              {/* Igualar evita el peor caso del stepper: cambiar el peso en
                  4 series es repetir el mismo viaje 4 veces. */}
              {sets.length > 1 && (
                <button
                  onClick={onEqualizeSets}
                  className="flex h-11 items-center gap-1.5 rounded-sm bg-surface-2 px-3.5 text-sm font-medium text-ink-2 transition-colors active:bg-surface-3"
                  title="Copiar reps y peso de la 1ª serie a las que faltan"
                >
                  <CopyCheck size={15} /> Igualar
                </button>
              )}
              {sets.length > 0 && (
                <button
                  onClick={onRemoveSet}
                  aria-label="Quitar la última serie"
                  className="h-11 rounded-sm bg-surface-2 px-4 text-sm font-medium text-danger/80 transition-colors active:bg-surface-3"
                >
                  −
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </Card>
  )
}

function ExerciseHeaderContent({
  exercise,
  isSuperset,
  showChips,
}: {
  exercise: Exercise | undefined
  isSuperset: boolean
  showChips: boolean
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <h2 className="truncate font-semibold">{exercise?.name ?? 'Ejercicio'}</h2>
        {isSuperset && (
          <span className="shrink-0 rounded-xs bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-accent">
            SS
          </span>
        )}
      </div>
      {showChips && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {exercise?.musclePrimary.map((m) => <MuscleChip key={m} muscle={m} />)}
        </div>
      )}
    </div>
  )
}

function ExerciseCounter({ completed, total }: { completed: number; total: number }) {
  return (
    <span
      className={cn(
        'shrink-0 font-mono text-[15px] font-bold tabular-nums',
        completed === total && total > 0 ? 'text-success' : 'text-ink-3'
      )}
    >
      {completed}/{total}
    </span>
  )
}

/**
 * Fila de serie con dos presentaciones.
 *
 * Compacta por defecto, y con steppers a ancho completo en la serie que se
 * está editando. El motivo no es estético: en un iPhone 14 Pro la tarjeta
 * deja 329px útiles, y dos steppers con botones de 44px (el mínimo táctil de
 * Apple) ocupan 96px fijos cada uno — al input le quedarían 16px. O los
 * botones son diminutos, o solo entra un stepper por fila.
 */
function SetRow({
  set,
  equipment,
  units,
  isActive,
  expanded,
  onExpand,
  onComplete,
  onUpdate,
}: {
  set: WorkoutSet
  equipment: Exercise['equipment']
  units: 'kg' | 'lbs'
  isActive: boolean
  expanded: boolean
  onExpand: () => void
  onComplete: () => void
  onUpdate: (patch: Partial<WorkoutSet>) => void
}) {
  // Todo se guarda en kg; la conversión es solo de presentación.
  const stepKg = WEIGHT_INCREMENT[equipment]
  const displayWeight = Number(formatWeight(set.weightKg, units))
  const displayStep = units === 'lbs' ? Math.max(1, Math.round(stepKg / 0.45359237)) : stepKg
  const weightLabel = isBodyweight(equipment) ? 'Lastre' : 'Peso'

  return (
    <div
      className={cn(
        'relative px-1 transition-colors',
        // Separador entre series en vez de una tarjeta por serie: la fila ya
        // vive dentro de la tarjeta del ejercicio.
        '[&:not(:first-of-type)]:border-t [&:not(:first-of-type)]:border-line-2',
        set.completed === 1 && 'opacity-55',
        // La serie activa NO lleva borde de acento a la izquierda: esa barra
        // de color al costado es el tell más reconocible de UI generada.
        // Alcanza con teñir el fondo y marcar el número.
        (isActive || expanded) && 'bg-surface-2/60'
      )}
    >
      {/* Flash plano al completar — refuerza el cambio de color del botón
          sin sumar un segundo rebote (DESIGN.md: uno solo, el del ícono). */}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0 rounded-xs bg-success/20 opacity-0',
          set.completed === 1 && 'animate-row-flash'
        )}
      />

      <div className="grid grid-cols-[2rem_1fr_1fr_3.5rem] items-center gap-2">
        {/* Tap en el número alterna serie de calentamiento (C) */}
        <button
          onClick={() => onUpdate({ isWarmup: set.isWarmup === 1 ? 0 : 1 })}
          className={cn(
            'flex h-11 w-8 items-center justify-center rounded-xs text-sm font-bold tabular-nums',
            set.isWarmup === 1
              ? 'bg-warning/20 text-warning'
              : isActive
              ? 'text-accent'
              : 'text-ink-3'
          )}
          title={set.isWarmup === 1 ? 'Serie de calentamiento' : 'Serie de trabajo'}
        >
          {set.isWarmup === 1 ? 'C' : set.setNumber}
        </button>

        <button
          onClick={onExpand}
          aria-label={`Editar la serie ${set.setNumber}`}
          aria-expanded={expanded}
          className="col-span-2 grid grid-cols-2 gap-2"
        >
          {/* tabular-nums: sin esto los números bailan de ancho al cambiar */}
          <span className="py-2.5 text-center font-mono text-base font-bold tabular-nums">
            {set.reps}
          </span>
          <span className="py-2.5 text-center font-mono text-base font-bold tabular-nums">
            {displayWeight}
          </span>
        </button>

        {/* 56px de ancho (antes 44px): más área táctil, pedido explícito. */}
        <button
          onClick={onComplete}
          aria-label={set.completed === 1 ? 'Desmarcar serie' : 'Completar serie'}
          className={cn(
            'flex h-11 w-full items-center justify-center rounded-lg border transition-colors',
            set.completed === 1
              ? 'animate-set-pop border-success bg-success text-bg'
              : 'border-line-2 text-ink-3'
          )}
        >
          <Check size={18} strokeWidth={3} />
        </button>
      </div>

      {/* Controles grandes: solo para la serie en edición, a ancho completo */}
      {expanded && (
        <div className="mt-1 space-y-1.5 px-1 pb-1.5">
          <div className="grid grid-cols-[3.25rem_1fr] items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">
              Reps
            </span>
            <NumberStepper
              value={set.reps}
              step={1}
              min={1}
              max={100}
              decimals={0}
              label="repeticiones"
              onChange={(reps) => onUpdate({ reps })}
            />
          </div>
          <div className="grid grid-cols-[3.25rem_1fr] items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">
              {weightLabel}
            </span>
            <NumberStepper
              value={displayWeight}
              step={displayStep}
              min={0}
              decimals={1}
              label={weightLabel.toLowerCase()}
              onChange={(shown) => onUpdate({ weightKg: displayToKg(shown, units) })}
            />
          </div>
        </div>
      )}

      {/* RPE: aparece al completar la serie de trabajo (opcional, un tap) */}
      {set.completed === 1 && set.isWarmup === 0 && (
        <div className="mt-1 flex items-center gap-1.5 px-1 pb-1">
          <span className="text-[10px] font-semibold uppercase text-ink-3">RPE</span>
          {[6, 7, 8, 8.5, 9, 10].map((value) => (
            <button
              key={value}
              onClick={() => onUpdate({ rpe: set.rpe === value ? undefined : value })}
              className={cn(
                'rounded-md px-2 py-1 font-mono text-xs font-bold',
                set.rpe === value ? 'bg-accent text-bg' : 'bg-surface-2 text-ink-3'
              )}
            >
              {value}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
