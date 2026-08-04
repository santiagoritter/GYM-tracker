import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowDown, ArrowLeft, ArrowUp, Link2, Moon, Plus, Trash2, X } from 'lucide-react'
import { db } from '@/db/schema'
import { softDelete } from '@/db/mutations'
import {
  ROUTINE_COLORS,
  addDay,
  addExerciseToDay,
  deleteDay,
  moveExercise,
  toggleSupersetWithPrevious,
  updateRoutine,
} from '@/db/routines'
import { ExercisePicker } from '@/components/gym/ExercisePicker'
import { MuscleChip } from '@/components/gym/MuscleChip'
import type { Exercise, RoutineExercise } from '@/types'
import { cn } from '@/lib/utils'

export default function RoutineEditor() {
  const { routineId } = useParams<{ routineId: string }>()
  const navigate = useNavigate()
  const [pickerDayId, setPickerDayId] = useState<string | null>(null)

  const routine = useLiveQuery(
    () => (routineId ? db.routines.get(routineId) : undefined),
    [routineId]
  )
  const days = useLiveQuery(
    () =>
      routineId
        ? db.routineDays.where('routineId').equals(routineId).sortBy('dayOrder')
        : [],
    [routineId]
  )
  const allEntries = useLiveQuery(() => db.routineExercises.toArray(), []) ?? []
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) ?? []
  const exerciseMap = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises])

  if (!routineId || !routine) return null

  const handleSelectExercise = (exercise: Exercise) => {
    if (pickerDayId && routine) addExerciseToDay(pickerDayId, routine.userId, exercise.id)
    setPickerDayId(null)
  }

  return (
    <div className="mx-auto min-h-screen max-w-lg pb-16">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-bg/95 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur">
        <button onClick={() => navigate('/rutinas')} className="p-1 text-ink-2">
          <ArrowLeft size={22} />
        </button>
        <input
          value={routine.name}
          onChange={(e) => updateRoutine(routineId, { name: e.target.value })}
          className="flex-1 bg-transparent text-lg font-semibold outline-none"
        />
      </header>

      <div className="space-y-4 px-4 py-4">
        <div className="flex gap-2">
          {ROUTINE_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => updateRoutine(routineId, { color })}
              className={cn(
                'h-8 w-8 rounded-full transition-transform',
                routine.color === color && 'scale-110 ring-2 ring-ink ring-offset-2 ring-offset-bg'
              )}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        {(days ?? []).map((day) => {
          const entries = allEntries
            .filter((e) => e.dayId === day.id)
            .sort((a, b) => a.exerciseOrder - b.exerciseOrder)
          return (
            <div key={day.id} className="rounded-2xl bg-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <input
                  value={day.name}
                  onChange={(e) => db.routineDays.update(day.id, { name: e.target.value })}
                  className="flex-1 bg-transparent font-semibold outline-none"
                />
                <button
                  onClick={() =>
                    db.routineDays.update(day.id, { isRest: day.isRest === 1 ? 0 : 1 })
                  }
                  className={cn(
                    'rounded-lg p-2',
                    day.isRest === 1 ? 'text-info' : 'text-ink-3'
                  )}
                  title="Marcar como día de descanso"
                >
                  <Moon size={18} />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`¿Eliminar "${day.name}"?`)) deleteDay(day.id)
                  }}
                  className="rounded-lg p-2 text-ink-3"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              {day.isRest === 1 ? (
                <p className="mt-2 text-sm text-ink-3">Día de descanso</p>
              ) : (
                <>
                  <div className="mt-3 space-y-2">
                    {entries.map((entry, index) => (
                      <RoutineExerciseRow
                        key={entry.id}
                        entry={entry}
                        exercise={exerciseMap.get(entry.exerciseId)}
                        isFirst={index === 0}
                        isLast={index === entries.length - 1}
                        linkedWithPrev={
                          index > 0 &&
                          entry.supersetGroup !== undefined &&
                          entries[index - 1].supersetGroup === entry.supersetGroup
                        }
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => setPickerDayId(day.id)}
                    className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-line-2 py-2.5 text-sm font-medium text-ink-2 active:bg-surface-2"
                  >
                    <Plus size={16} /> Agregar ejercicio
                  </button>
                </>
              )}
            </div>
          )
        })}

        <button
          onClick={() => addDay(routineId, routine.userId, `Día ${(days?.length ?? 0) + 1}`)}
          className="w-full rounded-2xl border border-line-2 py-4 font-semibold text-ink-2 active:bg-surface"
        >
          + Agregar día
        </button>
      </div>

      {pickerDayId && (
        <ExercisePicker
          onSelect={handleSelectExercise}
          onClose={() => setPickerDayId(null)}
        />
      )}
    </div>
  )
}

function RoutineExerciseRow({
  entry,
  exercise,
  isFirst,
  isLast,
  linkedWithPrev,
}: {
  entry: RoutineExercise
  exercise?: Exercise
  isFirst: boolean
  isLast: boolean
  linkedWithPrev: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-xl bg-surface-2 p-3',
        entry.supersetGroup !== undefined && 'border-l-2 border-accent',
        linkedWithPrev && '-mt-1 rounded-t-none'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">{exercise?.name ?? 'Ejercicio'}</p>
            {entry.supersetGroup !== undefined && (
              <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-accent">
                SS
              </span>
            )}
          </div>
          <div className="mt-1 flex gap-1">
            {exercise?.musclePrimary.map((m) => <MuscleChip key={m} muscle={m} />)}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            onClick={() => toggleSupersetWithPrevious(entry.id)}
            disabled={isFirst}
            className={cn(
              'rounded p-1.5 disabled:opacity-30',
              linkedWithPrev ? 'text-accent' : 'text-ink-3'
            )}
            title="Superserie con el ejercicio anterior"
          >
            <Link2 size={16} />
          </button>
          <button
            onClick={() => moveExercise(entry.id, -1)}
            disabled={isFirst}
            className="rounded p-1.5 text-ink-3 disabled:opacity-30"
          >
            <ArrowUp size={16} />
          </button>
          <button
            onClick={() => moveExercise(entry.id, 1)}
            disabled={isLast}
            className="rounded p-1.5 text-ink-3 disabled:opacity-30"
          >
            <ArrowDown size={16} />
          </button>
          <button
            onClick={() => softDelete('routineExercises', entry.id)}
            className="rounded p-1.5 text-ink-3"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-3 text-sm">
        <label className="flex items-center gap-1.5 text-ink-2">
          Series
          <input
            type="number"
            value={entry.setsTarget}
            onChange={(e) =>
              db.routineExercises.update(entry.id, {
                setsTarget: Math.max(1, Number(e.target.value) || 1),
              })
            }
            className="w-12 rounded bg-surface-3 py-1 text-center font-mono font-bold outline-none"
          />
        </label>
        <label className="flex items-center gap-1.5 text-ink-2">
          Reps
          <input
            type="number"
            value={entry.repsMin}
            onChange={(e) =>
              db.routineExercises.update(entry.id, {
                repsMin: Math.max(1, Number(e.target.value) || 1),
              })
            }
            className="w-12 rounded bg-surface-3 py-1 text-center font-mono font-bold outline-none"
          />
          –
          <input
            type="number"
            value={entry.repsMax}
            onChange={(e) =>
              db.routineExercises.update(entry.id, {
                repsMax: Math.max(entry.repsMin, Number(e.target.value) || entry.repsMin),
              })
            }
            className="w-12 rounded bg-surface-3 py-1 text-center font-mono font-bold outline-none"
          />
        </label>
      </div>
    </div>
  )
}
