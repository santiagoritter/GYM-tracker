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
import { Card, Row } from '@/components/ui/Card'
import type { Exercise, RoutineDay, RoutineExercise } from '@/types'
import { cn } from '@/lib/utils'

const REST_OPTIONS = [60, 90, 120, 180]

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
    <div className="mx-auto min-h-screen content-width pb-16">
      <header className="glass sticky top-0 z-30 flex items-center gap-3 border-b border-line px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <button
          onClick={() => navigate('/rutinas')}
          aria-label="Volver"
          className="flex h-11 w-11 shrink-0 items-center justify-center text-ink-2"
        >
          <ArrowLeft size={22} />
        </button>
        <input
          value={routine.name}
          onChange={(e) => updateRoutine(routineId, { name: e.target.value })}
          className="h-11 flex-1 bg-transparent text-lg font-semibold outline-none"
        />
      </header>

      <div className="space-y-5 px-4 py-4">
        <div className="flex gap-2 px-1">
          {ROUTINE_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => updateRoutine(routineId, { color })}
              aria-label={`Color ${color}`}
              className="flex h-11 w-11 shrink-0 items-center justify-center"
            >
              <span
                className={cn(
                  'h-6 w-6 rounded-full transition-transform',
                  routine.color === color && 'scale-110 ring-2 ring-ink ring-offset-2 ring-offset-bg'
                )}
                style={{ backgroundColor: color }}
              />
            </button>
          ))}
        </div>

        {(days ?? []).map((day) => {
          const entries = allEntries
            .filter((e) => e.dayId === day.id)
            .sort((a, b) => a.exerciseOrder - b.exerciseOrder)
          return (
            <section key={day.id}>
              <Card>
                <DayHeaderRow day={day} />
                {day.isRest === 1 ? (
                  <Row>
                    <p className="text-[14px] text-ink-3">Día de descanso</p>
                  </Row>
                ) : (
                  entries.map((entry, index) => (
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
                  ))
                )}
              </Card>
              {day.isRest === 0 && (
                <button
                  onClick={() => setPickerDayId(day.id)}
                  className="mt-2 flex h-11 w-full items-center justify-center gap-1.5 rounded-sm border border-dashed border-line-2 text-sm font-medium text-ink-2 active:bg-surface"
                >
                  <Plus size={16} /> Agregar ejercicio
                </button>
              )}
            </section>
          )
        })}

        <button
          onClick={() => addDay(routineId, routine.userId, `Día ${(days?.length ?? 0) + 1}`)}
          className="h-14 w-full rounded-md border border-line-2 font-semibold text-ink-2 active:bg-surface"
        >
          Agregar día
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

/** Nombre del día + toggle de descanso + borrar. Primera fila de la Card. */
function DayHeaderRow({ day }: { day: RoutineDay }) {
  return (
    <Row>
      <input
        value={day.name}
        onChange={(e) => db.routineDays.update(day.id, { name: e.target.value })}
        className="h-11 min-w-0 flex-1 bg-transparent font-semibold outline-none"
      />
      <button
        onClick={() => db.routineDays.update(day.id, { isRest: day.isRest === 1 ? 0 : 1 })}
        title="Marcar como día de descanso"
        aria-label="Marcar como día de descanso"
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center',
          day.isRest === 1 ? 'text-info' : 'text-ink-3'
        )}
      >
        <Moon size={18} />
      </button>
      <button
        onClick={() => {
          if (confirm(`¿Eliminar "${day.name}"?`)) deleteDay(day.id)
        }}
        aria-label="Eliminar día"
        className="flex h-11 w-11 shrink-0 items-center justify-center text-ink-3"
      >
        <Trash2 size={18} />
      </button>
    </Row>
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
  const [notesOpen, setNotesOpen] = useState(Boolean(entry.notes))

  return (
    <Row className="flex-col items-stretch gap-0">
      <div className="flex w-full items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">{exercise?.name ?? 'Ejercicio'}</p>
            {entry.supersetGroup !== undefined && (
              <span className="shrink-0 rounded-xs bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-accent">
                SS
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {exercise?.musclePrimary.map((m) => <MuscleChip key={m} muscle={m} />)}
          </div>
        </div>
        <div className="flex shrink-0 items-center">
          <button
            onClick={() => toggleSupersetWithPrevious(entry.id)}
            disabled={isFirst}
            title="Superserie con el ejercicio anterior"
            aria-label="Superserie con el ejercicio anterior"
            className={cn(
              'flex h-11 w-9 items-center justify-center disabled:opacity-30',
              linkedWithPrev ? 'text-accent' : 'text-ink-3'
            )}
          >
            <Link2 size={16} />
          </button>
          <button
            onClick={() => moveExercise(entry.id, -1)}
            disabled={isFirst}
            aria-label="Mover arriba"
            className="flex h-11 w-9 items-center justify-center text-ink-3 disabled:opacity-30"
          >
            <ArrowUp size={16} />
          </button>
          <button
            onClick={() => moveExercise(entry.id, 1)}
            disabled={isLast}
            aria-label="Mover abajo"
            className="flex h-11 w-9 items-center justify-center text-ink-3 disabled:opacity-30"
          >
            <ArrowDown size={16} />
          </button>
          <button
            onClick={() => softDelete('routineExercises', entry.id)}
            aria-label="Quitar ejercicio"
            className="flex h-11 w-9 items-center justify-center text-ink-3"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex items-center gap-2 text-[14px] text-ink-2">
          Series
          <input
            type="number"
            inputMode="numeric"
            value={entry.setsTarget}
            onFocus={(e) => e.target.select()}
            onChange={(e) =>
              db.routineExercises.update(entry.id, {
                setsTarget: Math.max(1, Number(e.target.value) || 1),
              })
            }
            className="h-9 w-12 rounded-xs bg-surface-2 text-center font-mono font-bold tabular-nums outline-none focus:ring-1 focus:ring-accent"
          />
        </label>
        <label className="flex items-center gap-2 text-[14px] text-ink-2">
          Reps
          <input
            type="number"
            inputMode="numeric"
            value={entry.repsMin}
            onFocus={(e) => e.target.select()}
            onChange={(e) =>
              db.routineExercises.update(entry.id, {
                repsMin: Math.max(1, Number(e.target.value) || 1),
              })
            }
            className="h-9 w-12 rounded-xs bg-surface-2 text-center font-mono font-bold tabular-nums outline-none focus:ring-1 focus:ring-accent"
          />
          <span className="text-ink-3">–</span>
          <input
            type="number"
            inputMode="numeric"
            value={entry.repsMax}
            onFocus={(e) => e.target.select()}
            onChange={(e) =>
              db.routineExercises.update(entry.id, {
                repsMax: Math.max(entry.repsMin, Number(e.target.value) || entry.repsMin),
              })
            }
            className="h-9 w-12 rounded-xs bg-surface-2 text-center font-mono font-bold tabular-nums outline-none focus:ring-1 focus:ring-accent"
          />
        </label>
      </div>

      {/* Descanso y notas: antes escritos por el código (QR, defaults) pero
          invisibles para el usuario — ningún editor los mostraba. */}
      <div className="mt-2 flex items-center gap-1.5">
        {REST_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => db.routineExercises.update(entry.id, { restSeconds: s })}
            className={cn(
              'flex h-8 items-center rounded-xs px-2.5 font-mono text-[12px] tabular-nums',
              entry.restSeconds === s ? 'bg-accent text-bg' : 'bg-surface-2 text-ink-3'
            )}
          >
            {s}s
          </button>
        ))}
        {!notesOpen && (
          <button
            onClick={() => setNotesOpen(true)}
            className="ml-auto h-8 px-2 text-[12px] text-ink-3 active:text-ink-2"
          >
            {entry.notes ? 'Ver nota' : 'Agregar nota'}
          </button>
        )}
      </div>
      {notesOpen && (
        <input
          value={entry.notes ?? ''}
          onChange={(e) =>
            db.routineExercises.update(entry.id, { notes: e.target.value || undefined })
          }
          placeholder="Nota (ej: pin 7, banco inclinado a 30°)"
          className="mt-2 h-9 w-full rounded-xs bg-surface-2 px-3 text-[13px] outline-none focus:ring-1 focus:ring-accent"
        />
      )}
    </Row>
  )
}
