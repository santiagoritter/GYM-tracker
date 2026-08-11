import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion, useReducedMotion } from 'motion/react'
import { CheckCircle2, Circle, Plus, Search, X } from 'lucide-react'
import { db } from '@/db/schema'
import { routinesFor } from '@/db/scoped'
import { addDay, addExerciseToDay, createRoutine } from '@/db/routines'
import { softDelete } from '@/db/mutations'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import Portal from '@/components/ui/Portal'
import { toast } from '@/stores/toastStore'
import type { Exercise, RoutineDay } from '@/types'
import {
  sheetItemVariants,
  sheetItemVariantsReduced,
  sheetPanelVariants,
  sheetPanelVariantsReduced,
} from '@/lib/motionVariants'

/**
 * "Agregar a rutina" al estilo de "Agregar a playlist" de Spotify:
 * buscador arriba, lista de destinos con check abajo (tocar
 * suma/saca, no hay un paso de "confirmar" aparte), opción de crear
 * uno nuevo al final. Adaptado a que acá el destino real es un DÍA de
 * rutina, no la rutina en sí (una rutina no tiene ejercicios propios,
 * los tienen sus días) — la lista agrupa por rutina pero cada fila
 * marcable es un día, y los días de descanso quedan afuera (no tienen
 * ejercicios).
 */
export default function AddToRoutineSheet({
  exercise,
  onClose,
}: {
  exercise: Exercise
  onClose: () => void
}) {
  const userId = useCurrentUserId()
  const reduced = useReducedMotion()
  const [query, setQuery] = useState('')
  const [creatingRoutine, setCreatingRoutine] = useState(false)
  const [newRoutineName, setNewRoutineName] = useState('')

  const routines = useLiveQuery(
    () => (userId ? routinesFor(userId).filter((r) => r.isArchived === 0).toArray() : []),
    [userId]
  ) ?? []
  const days = useLiveQuery(() => db.routineDays.toArray(), []) ?? []
  const entries = useLiveQuery(
    () => db.routineExercises.where('exerciseId').equals(exercise.id).toArray(),
    [exercise.id]
  ) ?? []

  const dayIdsWithExercise = useMemo(() => new Set(entries.map((e) => e.dayId)), [entries])

  const daysByRoutine = useMemo(() => {
    const map = new Map<string, RoutineDay[]>()
    for (const d of days) {
      if (d.isRest === 1) continue // un día de descanso no tiene ejercicios
      const list = map.get(d.routineId) ?? []
      list.push(d)
      map.set(d.routineId, list)
    }
    for (const list of map.values()) list.sort((a, b) => a.dayOrder - b.dayOrder)
    return map
  }, [days])

  const filteredRoutines = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return routines
    return routines.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (daysByRoutine.get(r.id) ?? []).some((d) => d.name.toLowerCase().includes(q))
    )
  }, [routines, daysByRoutine, query])

  const handleToggleDay = async (day: RoutineDay) => {
    if (dayIdsWithExercise.has(day.id)) {
      const entry = entries.find((e) => e.dayId === day.id)
      if (entry) await softDelete('routineExercises', entry.id)
      toast.success('Quitado', `${exercise.name} ya no está en "${day.name}"`)
    } else {
      if (!userId) return
      await addExerciseToDay(day.id, userId, exercise.id)
      toast.success('Agregado', `${exercise.name} se sumó a "${day.name}"`)
    }
  }

  const handleCreateRoutine = async () => {
    const trimmed = newRoutineName.trim()
    if (!trimmed || !userId) return
    const routineId = await createRoutine(userId, trimmed)
    const dayId = await addDay(routineId, userId, 'Día 1')
    await addExerciseToDay(dayId, userId, exercise.id)
    setNewRoutineName('')
    setCreatingRoutine(false)
    toast.success('Rutina creada', `${exercise.name} se agregó a "${trimmed}"`)
  }

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

          <div className="flex items-start justify-between px-5 pt-1 pb-3">
            <div className="min-w-0 pr-4">
              <h2 className="text-xl font-bold leading-tight">Agregar a rutina</h2>
              <p className="mt-0.5 truncate text-[13px] text-ink-2">{exercise.name}</p>
            </div>
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
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar rutina o día…"
                className="w-full bg-transparent text-[15px] outline-none placeholder:text-ink-3"
              />
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={reduced ? sheetItemVariantsReduced : sheetItemVariants}
          className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 pb-[calc(2rem+env(safe-area-inset-bottom))]"
        >
          {filteredRoutines.length === 0 && !creatingRoutine && (
            <p className="py-6 text-center text-[14px] text-ink-3">Sin resultados.</p>
          )}

          {filteredRoutines.map((routine) => {
            const routineDays = daysByRoutine.get(routine.id) ?? []
            return (
              <div key={routine.id}>
                <div className="mb-1.5 flex items-center gap-2 px-1">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: routine.color }}
                  />
                  <span className="truncate text-[13px] font-semibold text-ink-2">
                    {routine.name}
                  </span>
                </div>
                {routineDays.length === 0 ? (
                  <p className="px-1 text-[13px] text-ink-3">Todavía sin días de entreno.</p>
                ) : (
                  <div className="space-y-1">
                    {routineDays.map((day) => {
                      const checked = dayIdsWithExercise.has(day.id)
                      return (
                        <button
                          key={day.id}
                          onClick={() => handleToggleDay(day)}
                          className="flex w-full items-center gap-3 rounded-xl bg-surface-2 px-4 py-3 text-left active:bg-surface-3"
                        >
                          <span className="min-w-0 flex-1 truncate text-[15px]">{day.name}</span>
                          {checked ? (
                            <CheckCircle2 size={20} className="shrink-0 text-accent" />
                          ) : (
                            <Circle size={20} className="shrink-0 text-ink-3" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          {creatingRoutine ? (
            <div className="flex gap-2">
              <input
                autoFocus
                value={newRoutineName}
                onChange={(e) => setNewRoutineName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateRoutine()}
                placeholder="Nombre de la rutina"
                className="h-12 flex-1 rounded-sm bg-surface-2 px-3 text-sm outline-none focus:ring-1 focus:ring-accent placeholder:text-ink-3"
              />
              <button
                onClick={handleCreateRoutine}
                className="h-12 shrink-0 rounded-sm bg-accent px-4 font-semibold text-bg"
              >
                Crear
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCreatingRoutine(true)}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-sm border border-dashed border-line-2 font-semibold text-ink-2 active:bg-surface-2"
            >
              <Plus size={16} /> Nueva rutina
            </button>
          )}
        </motion.div>
      </motion.div>
    </Portal>
  )
}
