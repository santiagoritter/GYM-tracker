import { useRef, useState } from 'react'
import type { RefObject } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowLeftRight, Play, QrCode, Star, Trash2 } from 'lucide-react'
import { Card, Row } from '@/components/ui/Card'
import Portal from '@/components/ui/Portal'
import type { Routine, RoutineDay } from '@/types'
import { cn } from '@/lib/utils'
import RoutineStackCard, { FRONT_HEIGHT } from './RoutineStackCard'

/**
 * Ráfaga de puntitos al tocar "Cambiar rutina" — adaptado de
 * ParticleButton (kokonutui): mismo mecanismo (posición real del botón
 * vía getBoundingClientRect, puntos `fixed` para escapar cualquier
 * overflow, dispersión con delay escalonado), pero con el color de
 * acento de la app en vez de negro/blanco fijo, sin el ícono
 * `MousePointerClick` que suma la referencia, y sin el wrapper
 * `Button`/`ButtonProps` de shadcn (no está instalado en este proyecto,
 * ver CLAUDE.md §4) — el motion.span se dispara desde el propio botón.
 */
function SwitchParticles({ originRef }: { originRef: RefObject<HTMLButtonElement> }) {
  const rect = originRef.current?.getBoundingClientRect()
  if (!rect) return null
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2

  return (
    <AnimatePresence>
      {[...Array(6)].map((_, i) => (
        <motion.span
          key={i}
          className="fixed z-40 h-1 w-1 rounded-full bg-accent"
          style={{ left: centerX, top: centerY }}
          initial={{ scale: 0, x: 0, y: 0 }}
          animate={{
            scale: [0, 1, 0],
            x: [0, (i % 2 ? 1 : -1) * (Math.random() * 50 + 20)],
            y: [0, -Math.random() * 50 - 20],
          }}
          transition={{ duration: 0.6, delay: i * 0.08, ease: 'easeOut' }}
        />
      ))}
    </AnimatePresence>
  )
}

// Mazo derecho, sin ángulo ni desplazamiento lateral — pedido explícito
// del usuario sobre la versión anterior (que tenía rotación + offset en
// X, aspecto de notas desparramadas): solo una debajo de la otra, más
// separadas todavía que el primer ajuste (48 → 64).
const Y_STEP = 64
const MAX_STACK_STEP = 4
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
  // Qué rutina está al frente del mazo — "Cambiar rutina" gira esto, no
  // selecciona: cambia el ORDEN de las cartas (la de arriba pasa al
  // fondo, la siguiente queda al frente), pedido explícito tras la
  // primera versión, que en cambio abría/seleccionaba una rutina.
  const [frontIndex, setFrontIndex] = useState(0)
  const [showParticles, setShowParticles] = useState(false)
  const switchRef = useRef<HTMLButtonElement>(null)
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

  // Orden visual del mazo, derivado en el render (no en un efecto): rota
  // el array de rutinas para que la de índice `frontIndex` quede primera
  // — no muta `routines`, así que las keys/props de cada card siguen
  // siendo las mismas, solo cambia SU POSICIÓN en el mazo, y motion anima
  // la transición vía el `animate` prop de RoutineStackCard.
  const safeFront = routines.length ? frontIndex % routines.length : 0
  const displayOrder = [...routines.slice(safeFront), ...routines.slice(0, safeFront)]

  const handleSwitch = () => {
    if (routines.length < 2) return
    setFrontIndex((i) => (i + 1) % routines.length)
    if (!reduced) {
      setShowParticles(true)
      setTimeout(() => setShowParticles(false), 600)
    }
  }

  return (
    <>
      <motion.div
        className="relative"
        animate={{ height: containerHeight }}
        transition={SPRING}
      >
        {displayOrder.map((routine, index) => {
          const step = Math.min(index, MAX_STACK_STEP)
          const pose = { y: step * Y_STEP }
          return (
            <RoutineStackCard
              key={routine.id}
              routine={routine}
              days={daysByRoutine.get(routine.id) ?? []}
              pose={pose}
              stackOrder={displayOrder.length - index}
              isFront={index === 0}
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

      {/* Portal a document.body: <main> en Layout.tsx tiene animate-fade-up,
          cuya animación deja un transform aplicado (fill-mode both) — eso
          convierte a <main> en el "contenedor" de cualquier position:fixed
          de adentro en vez de la ventana, y el botón queda atrapado
          dentro de su caja (se mueve con el scroll) en vez de fijo arriba
          de la tab bar. Mismo problema, mismo arreglo, que ya resuelven
          los sheets (ver el comentario de Portal.tsx). */}
      <Portal>
        {/* Apenas arriba de la tab bar (mismo nivel que la píldora de
            "Entreno en curso" de Layout.tsx) — pedido explícito: en el
            flujo normal de la página se iba demasiado abajo con varias
            rutinas. Desaparece mientras hay una rutina abierta para no
            interrumpir. */}
        {routines.length > 1 && !selectedId && (
          <button
            ref={switchRef}
            onClick={handleSwitch}
            className="animate-scale-in fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-bold text-bg active:bg-accent-dim"
          >
            <ArrowLeftRight size={16} />
            Cambiar rutina
          </button>
        )}
        {showParticles && <SwitchParticles originRef={switchRef} />}
      </Portal>
    </>
  )
}
