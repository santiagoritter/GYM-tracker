import { useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { Play, QrCode, Repeat2, Star, Trash2, X } from 'lucide-react'
import { Row } from '@/components/ui/Card'
import type { Routine, RoutineDay } from '@/types'
import { cn } from '@/lib/utils'

const SPRING = { type: 'spring' as const, damping: 30, stiffness: 300 }
// 108 → 200 → 240: cada ronda de feedback pidió una carta más grande.
// Ahora con lugar de sobra para el preview de días (hasta 6, antes 4) sin
// apretarse.
export const FRONT_HEIGHT = 240

export interface RoutineStackCardProps {
  routine: Routine
  days: RoutineDay[]
  pose: { y: number; scale: number; opacity: number }
  stackOrder: number
  isFront: boolean
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
  isFront,
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
        scale: isSelected ? 1 : pose.scale,
        opacity: dimmed ? 0.35 : pose.opacity,
      }}
      transition={SPRING}
    >
      <motion.div
        className="relative rounded-2xl"
        animate={{ height: isSelected ? undefined : FRONT_HEIGHT }}
        transition={SPRING}
        style={{ perspective: 1400 }}
      >
        {/* Aura de acento — pedido explícito del usuario. DESIGN.md §0 lista
            el glow/halo de color como anti-patrón por defecto; acá se hace
            una excepción puntual, avisada, no una reapertura general de la
            regla (sigue sin usarse en ningún otro lado).
            Delimita la carta AL FRENTE del mazo (la que "Cambiar rutina"
            va rotando), no la seleccionada: dado vuelta sobre el primer
            intento, pedido explícito — al frente es donde ayuda a saber
            cuál es cuál mientras se navega el mazo; una vez que se abre
            una (isSelected), ya está identificada de sobra por su propio
            contenido, el aura ahí sobraba.
            Capa propia con su propia transición de opacity (rápida, 180ms),
            no atada al contenedor que anima `height` con spring (ver
            historial: eso hacía que se percibiera con retraso). */}
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-2xl shadow-[0_0_0_1.5px_rgb(var(--color-accent)/0.7),0_0_28px_rgb(var(--color-accent)/0.45)]"
          animate={{ opacity: isFront && !isSelected ? 1 : 0 }}
          transition={{ duration: 0.18 }}
        />
        <motion.div
          className="relative"
          animate={{ rotateY: isSelected ? 180 : 0 }}
          transition={SPRING}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Frente — con preview de los días para que se pueda
              "visualizar" la rutina sin tener que flippear (hasta 6, antes
              4: la carta más alta da lugar de sobra). Estrella de acento si
              es la rutina favorita — mismo dato que ya usa el botón de
              favorito del reverso, ninguna consulta nueva. */}
          <button
            type="button"
            onClick={onSelect}
            disabled={!frontInteractive}
            aria-label={`Ver rutina ${routine.name}`}
            className={cn(
              'card-shine relative flex h-[240px] w-full flex-col justify-between rounded-2xl bg-surface p-5 text-left [backface-visibility:hidden]',
              isSelected && 'pointer-events-none'
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className="h-3.5 w-3.5 shrink-0 rounded-full"
                  style={{ backgroundColor: routine.color }}
                />
                <span className="truncate text-xl font-semibold">{routine.name}</span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {routine.isActive === 1 && (
                  <Star size={16} className="text-accent" fill="currentColor" />
                )}
                <Repeat2 size={18} className="text-ink-3" />
              </div>
            </div>
            <div>
              <p className="text-[13px] text-ink-3">
                {days.length} {days.length === 1 ? 'día' : 'días'}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {days.slice(0, 6).map((day) => (
                  <span
                    key={day.id}
                    className="rounded-full bg-fill px-2.5 py-1 text-[12px] font-medium text-ink-2"
                  >
                    {day.name}
                  </span>
                ))}
                {days.length > 6 && (
                  <span className="rounded-full bg-fill px-2.5 py-1 text-[12px] font-medium text-ink-3">
                    +{days.length - 6}
                  </span>
                )}
              </div>
            </div>
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
