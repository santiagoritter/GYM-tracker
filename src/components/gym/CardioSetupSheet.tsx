import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { Play, X } from 'lucide-react'
import ResponsiveSheet from '@/components/ui/ResponsiveSheet'
import { useSheetDrag } from '@/hooks/useSheetDrag'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { useWorkoutStore } from '@/stores/workoutStore'
import { useCardioStore } from '@/stores/cardioStore'
import { CARDIO_MACHINES, cardioMachine, type CardioMachineId } from '@/lib/cardio'
import { sheetItemVariants, sheetItemVariantsReduced } from '@/lib/motionVariants'
import { cn } from '@/lib/utils'
import HoldButton from '@/components/ui/HoldButton'
import NumberStepper from '@/components/ui/NumberStepper'

/**
 * Setup del modo cardio: elegir aparato, velocidad e inclinación antes de
 * entrar a la pantalla completa. Sheet en vez de pantalla propia — se abre
 * desde el tile de Inicio, y al confirmar arranca la sesión (workout +
 * cardioStore) y recién ahí navega a /cardio, que lee la sesión ya
 * arrancada en vez de tener su propio paso de setup.
 */
export default function CardioSetupSheet({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const userId = useCurrentUserId()
  const reduced = useReducedMotion()
  const { panelDragProps, handleDragProps } = useSheetDrag(onClose)
  const startWorkout = useWorkoutStore((s) => s.startWorkout)
  const startSession = useCardioStore((s) => s.startSession)

  const [machineId, setMachineId] = useState<CardioMachineId>('treadmill')
  const [speed, setSpeedValue] = useState(6)
  const [incline, setInclineValue] = useState(1)

  const machine = cardioMachine(machineId)

  const handleStart = async () => {
    if (!userId) return
    const workoutId = await startWorkout(userId, `Cardio · ${machine.label}`)
    startSession(workoutId, machineId, machine.hasSpeed ? speed : 0, incline)
    onClose()
    navigate('/cardio')
  }

  return (
    <ResponsiveSheet onClose={onClose} dragProps={panelDragProps} panelClassName="flex max-h-[85vh] flex-col">
      <motion.div variants={reduced ? sheetItemVariantsReduced : sheetItemVariants}>
        <div className="flex justify-center pt-3 pb-1" {...handleDragProps}>
          <div className="h-1 w-10 rounded-full bg-line-2" />
        </div>

        <div className="flex items-start justify-between px-5 pt-1 pb-3">
          <div>
            <h2 className="text-xl font-bold leading-tight">Modo cardio</h2>
            <p className="mt-0.5 text-[13px] text-ink-2">Elegí el aparato antes de arrancar</p>
          </div>
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
          <p className="mb-2 text-sm font-semibold text-ink-2">¿En qué aparato vas a hacer cardio?</p>
          <div className="flex flex-wrap gap-2">
            {CARDIO_MACHINES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMachineId(m.id)}
                className={cn(
                  'flex h-10 shrink-0 items-center whitespace-nowrap rounded-full px-4 text-[13px] font-medium transition-colors',
                  machineId === m.id ? 'bg-accent text-bg' : 'bg-fill text-ink-2 active:bg-fill-2'
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {machine.hasSpeed ? (
          <div className="space-y-4 rounded-xl bg-surface-2 p-4">
            <div>
              <p className="mb-0.5 text-[14px] font-semibold">¿A qué velocidad vas a ir?</p>
              <p className="mb-2 text-[12px] text-ink-3">
                Con esto se calcula la distancia recorrida durante la sesión.
              </p>
              <NumberStepper value={speed} step={0.5} min={0.5} max={30} decimals={1} onChange={setSpeedValue} />
            </div>

            {machine.hasIncline && (
              <div>
                <p className="mb-0.5 text-[14px] font-semibold">¿Con qué inclinación?</p>
                <p className="mb-2 text-[12px] text-ink-3">0% es plano, sin pendiente.</p>
                <NumberStepper value={incline} step={0.5} min={0} max={15} decimals={1} onChange={setInclineValue} />
              </div>
            )}
          </div>
        ) : (
          <p className="rounded-xl bg-surface-2 p-4 text-[13px] leading-relaxed text-ink-2">
            Este aparato no tiene velocidad en km/h, así que el modo cardio va a cronometrar la
            sesión sin calcular distancia.
          </p>
        )}
      </motion.div>

      <motion.div
        variants={reduced ? sheetItemVariantsReduced : sheetItemVariants}
        className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2"
      >
        <HoldButton
          onComplete={handleStart}
          holdDuration={500}
          className="card-shine flex w-full flex-col items-center gap-0.5 rounded-2xl bg-accent py-4 font-bold text-bg active:bg-accent-dim"
        >
          <span className="flex items-center gap-2 text-lg">
            <Play size={20} fill="currentColor" /> Comenzar
          </span>
          <span className="text-[12px] font-semibold opacity-70">Mantené presionado</span>
        </HoldButton>
      </motion.div>
    </ResponsiveSheet>
  )
}
