import { useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { Play, QrCode, Repeat2, Star, Trash2, X } from 'lucide-react'
import { Row } from '@/components/ui/Card'
import type { Routine, RoutineDay } from '@/types'
import { cn } from '@/lib/utils'

const SPRING = { type: 'spring' as const, damping: 30, stiffness: 300 }
export const FRONT_HEIGHT = 84

export interface RoutineStackCardProps {
  routine: Routine
  days: RoutineDay[]
  pose: { y: number; rotate: number }
  stackOrder: number
  isSelected: boolean
  dimmed: boolean
  onSelect: () => void
  onDeselect: () => void
  onHeightChange: (height: number) => void
  onTrain: (dayId: string) => void
  onEdit: () => void
  onShare: () => void
  onToggleFavorite: () => void
  onDelete: () => void
}

/**
 * Fase 51 — Card Stack + Card Flip (kokonutui, adaptados). Card Stack está
 * pensada para 4 ítems fijos con foto de producto; acá el número de
 * rutinas es variable y `Routine` no tiene foto. Se adapta la técnica
 * (offset por índice al estar apilada, giro para revelar más al
 * seleccionarla), no la forma — sin blur por carta (DESIGN.md lo
 * restringe a header/tab bar/sheets), sin paleta naranja, sin
 * `next/image`.
 *
 * El reverso mide su alto real en vivo (mismo mecanismo que el ancho de
 * la tab bar, Fase 45): la lista de días de una rutina va de ~1 a 7+,
 * fijar un alto recortaría rutinas largas y no hay scroll interno en
 * ningún otro lado de la app.
 *
 * Solo se usa con motion habilitado — `RoutineStack.tsx` resuelve
 * `prefers-reduced-motion` renderizando la lista plana de siempre en vez
 * de este componente, no una variante sin animación del mismo: "tocar
 * para revelar" no tiene una versión estática con sentido propio.
 */
export default function RoutineStackCard({
  routine,
  days,
  pose,
  stackOrder,
  isSelected,
  dimmed,
  onSelect,
  onDeselect,
  onHeightChange,
  onTrain,
  onEdit,
  onShare,
  onToggleFavorite,
  onDelete,
}: RoutineStackCardProps) {
  const backRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = backRef.current
    if (!el) return
    const measure = () => onHeightChange(el.getBoundingClientRect().height)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days.length])

  const frontInteractive = !dimmed && !isSelected

  return (
    <motion.div
      className="absolute inset-x-0 top-0"
      style={{ zIndex: isSelected ? 30 : stackOrder }}
      animate={{
        y: isSelected ? 0 : pose.y,
        rotate: isSelected ? 0 : pose.rotate,
        opacity: dimmed ? 0.35 : 1,
      }}
      transition={SPRING}
    >
      <motion.div
        className="relative"
        animate={{ height: isSelected ? undefined : FRONT_HEIGHT }}
        transition={SPRING}
        style={{ perspective: 1400 }}
      >
        <motion.div
          className="relative"
          animate={{ rotateY: isSelected ? 180 : 0 }}
          transition={SPRING}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Frente */}
          <button
            type="button"
            onClick={onSelect}
            disabled={!frontInteractive}
            aria-label={`Ver rutina ${routine.name}`}
            className={cn(
              'card-shine relative flex h-[84px] w-full items-center gap-3 rounded-2xl bg-surface px-4 text-left [backface-visibility:hidden]',
              isSelected && 'pointer-events-none'
            )}
          >
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: routine.color }}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{routine.name}</span>
              <span className="block text-[13px] text-ink-3">
                {days.length} {days.length === 1 ? 'día' : 'días'}
              </span>
            </span>
            <Repeat2 size={16} className="shrink-0 text-ink-3" />
          </button>

          {/* Reverso */}
          <div
            ref={backRef}
            className={cn(
              'absolute inset-x-0 top-0 overflow-hidden rounded-2xl bg-surface [backface-visibility:hidden] [transform:rotateY(180deg)]',
              !isSelected && 'pointer-events-none'
            )}
          >
            <Row>
              <button
                onClick={onEdit}
                aria-label={`Editar rutina ${routine.name}`}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: routine.color }}
                />
                <span className="truncate font-semibold">{routine.name}</span>
              </button>
              <div className="flex shrink-0">
                <button
                  onClick={onShare}
                  aria-label="Compartir por QR"
                  className="flex h-11 w-9 items-center justify-center text-ink-3"
                >
                  <QrCode size={18} />
                </button>
                <button
                  onClick={onToggleFavorite}
                  aria-label="Marcar como rutina favorita"
                  className={cn(
                    'flex h-11 w-9 items-center justify-center',
                    routine.isActive === 1 ? 'text-accent' : 'text-ink-3'
                  )}
                >
                  <Star size={18} fill={routine.isActive === 1 ? 'currentColor' : 'none'} />
                </button>
                <button
                  onClick={onDelete}
                  aria-label="Eliminar rutina"
                  className="flex h-11 w-9 items-center justify-center text-ink-3"
                >
                  <Trash2 size={18} />
                </button>
                <button
                  onClick={onDeselect}
                  aria-label="Cerrar"
                  className="flex h-11 w-9 items-center justify-center text-ink-3"
                >
                  <X size={18} />
                </button>
              </div>
            </Row>

            {days.map((day) => (
              <Row key={day.id}>
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate text-[14px]',
                    day.isRest === 1 && 'text-ink-3'
                  )}
                >
                  {day.name}
                  {day.isRest === 1 && ' · descanso'}
                </span>
                {day.isRest === 0 && (
                  <button
                    onClick={() => onTrain(day.id)}
                    className="flex h-9 shrink-0 items-center gap-1.5 rounded-xs bg-accent px-3 text-[13px] font-bold text-bg"
                  >
                    <Play size={13} fill="currentColor" /> Entrenar
                  </button>
                )}
              </Row>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
