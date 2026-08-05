import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Play, QrCode, Star, Trash2 } from 'lucide-react'
import { Card, Row } from '@/components/ui/Card'
import type { Routine, RoutineDay } from '@/types'
import { cn } from '@/lib/utils'
import RoutineStackCard, { FRONT_HEIGHT } from './RoutineStackCard'

const Y_STEP = 10
const ROTATE_STEP = 1.4
const MAX_STACK_STEP = 5
const SPRING = { type: 'spring' as const, damping: 30, stiffness: 300 }

export interface RoutineStackProps {
  routines: Routine[]
  daysByRoutine: Map<string, RoutineDay[]>
  onTrain: (dayId: string) => void
  onEdit: (routine: Routine) => void
  onShare: (routine: Routine) => void
  onToggleFavorite: (routineId: string) => void
  onDelete: (routine: Routine) => void
}

export default function RoutineStack({
  routines,
  daysByRoutine,
  onTrain,
  onEdit,
  onShare,
  onToggleFavorite,
  onDelete,
}: RoutineStackProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [heights, setHeights] = useState<Record<string, number>>({})
  const reduced = useReducedMotion()

  if (routines.length === 0) return null

  // Reduced motion: la lista de siempre, plana, todo visible — "tocar
  // para revelar" no tiene una versión estática con sentido, así que no
  // se intenta simular el flip sin animación.
  if (reduced) {
    return (
      <>
        {routines.map((routine) => {
          const days = daysByRoutine.get(routine.id) ?? []
          return (
            <Card
              key={routine.id}
              className={cn(routine.isActive === 1 && 'ring-1 ring-accent/50')}
            >
              <Row>
                <button
                  onClick={() => onEdit(routine)}
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
                    onClick={() => onShare(routine)}
                    aria-label="Compartir por QR"
                    className="flex h-11 w-9 items-center justify-center text-ink-3"
                  >
                    <QrCode size={18} />
                  </button>
                  <button
                    onClick={() => onToggleFavorite(routine.id)}
                    aria-label="Marcar como rutina favorita"
                    className={cn(
                      'flex h-11 w-9 items-center justify-center',
                      routine.isActive === 1 ? 'text-accent' : 'text-ink-3'
                    )}
                  >
                    <Star size={18} fill={routine.isActive === 1 ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    onClick={() => onDelete(routine)}
                    aria-label="Eliminar rutina"
                    className="flex h-11 w-9 items-center justify-center text-ink-3"
                  >
                    <Trash2 size={18} />
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
            </Card>
          )
        })}
      </>
    )
  }

  const stackSpread = Math.min(routines.length - 1, MAX_STACK_STEP) * Y_STEP
  const containerHeight = selectedId
    ? (heights[selectedId] ?? FRONT_HEIGHT)
    : FRONT_HEIGHT + stackSpread

  return (
    <motion.div
      className="relative"
      animate={{ height: containerHeight }}
      transition={SPRING}
    >
      {routines.map((routine, index) => {
        const step = Math.min(index, MAX_STACK_STEP)
        const pose = {
          y: step * Y_STEP,
          rotate: step * ROTATE_STEP * (index % 2 === 0 ? 1 : -1),
        }
        return (
          <RoutineStackCard
            key={routine.id}
            routine={routine}
            days={daysByRoutine.get(routine.id) ?? []}
            pose={pose}
            stackOrder={routines.length - index}
            isSelected={selectedId === routine.id}
            dimmed={selectedId !== null && selectedId !== routine.id}
            onSelect={() => setSelectedId(routine.id)}
            onDeselect={() => setSelectedId(null)}
            onHeightChange={(h) =>
              setHeights((prev) => (prev[routine.id] === h ? prev : { ...prev, [routine.id]: h }))
            }
            onTrain={onTrain}
            onEdit={() => onEdit(routine)}
            onShare={() => onShare(routine)}
            onToggleFavorite={() => onToggleFavorite(routine.id)}
            onDelete={() => onDelete(routine)}
          />
        )
      })}
    </motion.div>
  )
}
