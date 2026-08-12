import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, CalendarPlus, ListPlus, Trash2 } from 'lucide-react'
import { db } from '@/db/schema'
import { logPastWorkout, type PastWorkoutExerciseInput } from '@/db/pastWorkouts'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { ExercisePicker } from '@/components/gym/ExercisePicker'
import NumberStepper from '@/components/ui/NumberStepper'
import { Card, EmptyState, SectionHeader } from '@/components/ui/Card'
import type { Exercise } from '@/types'
import { dateInputToIso, displayToKg, formatWeight } from '@/lib/utils'
import { WEIGHT_INCREMENT, isBodyweight } from '@/lib/loading'
import { toast } from '@/stores/toastStore'

interface DraftSet {
  reps: number
  weightKg: number
}

interface DraftExercise {
  exerciseId: string
  sets: DraftSet[]
}

function todayInputValue(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function LogPastWorkout() {
  const navigate = useNavigate()
  const userId = useCurrentUserId()
  const profile = useLiveQuery(
    () => (userId ? db.profile.get(userId) : undefined),
    [userId]
  )
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) ?? []
  const exerciseMap = new Map(exercises.map((e) => [e.id, e]))
  const units = profile?.units ?? 'kg'

  const [date, setDate] = useState(todayInputValue())
  const [name, setName] = useState('')
  const [draftExercises, setDraftExercises] = useState<DraftExercise[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSelectExercise = (exercise: Exercise) => {
    setDraftExercises((prev) => [...prev, { exerciseId: exercise.id, sets: [{ reps: 10, weightKg: 0 }] }])
    setPickerOpen(false)
  }

  const handleAddSet = (exerciseId: string) => {
    setDraftExercises((prev) =>
      prev.map((ex) => {
        if (ex.exerciseId !== exerciseId) return ex
        const last = ex.sets[ex.sets.length - 1]
        return { ...ex, sets: [...ex.sets, { reps: last?.reps ?? 10, weightKg: last?.weightKg ?? 0 }] }
      })
    )
  }

  const handleUpdateSet = (exerciseId: string, index: number, patch: Partial<DraftSet>) => {
    setDraftExercises((prev) =>
      prev.map((ex) => {
        if (ex.exerciseId !== exerciseId) return ex
        return { ...ex, sets: ex.sets.map((s, i) => (i === index ? { ...s, ...patch } : s)) }
      })
    )
  }

  // Quitar la última serie de un ejercicio lo saca de la lista si se
  // queda sin ninguna — no tiene sentido un ejercicio con 0 series acá.
  const handleRemoveSet = (exerciseId: string) => {
    setDraftExercises((prev) =>
      prev
        .map((ex) => (ex.exerciseId === exerciseId ? { ...ex, sets: ex.sets.slice(0, -1) } : ex))
        .filter((ex) => ex.sets.length > 0)
    )
  }

  const handleRemoveExercise = (exerciseId: string) => {
    setDraftExercises((prev) => prev.filter((ex) => ex.exerciseId !== exerciseId))
  }

  const handleSave = async () => {
    if (!userId || draftExercises.length === 0 || saving) return
    setSaving(true)
    const dateIso = dateInputToIso(date)
    const weekday = new Date(dateIso).toLocaleDateString('es-AR', { weekday: 'long' })
    const finalName = name.trim() || `Entreno del ${weekday}`
    const payload: PastWorkoutExerciseInput[] = draftExercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      sets: ex.sets.map((s) => ({ reps: s.reps, weightKg: s.weightKg })),
    }))

    const { newPRs } = await logPastWorkout(userId, finalName, dateIso, payload)
    setSaving(false)
    toast.success(
      'Entreno cargado',
      newPRs.length > 0
        ? `Se registró y sumó ${newPRs.length === 1 ? '1 PR' : `${newPRs.length} PRs`} a tu historial.`
        : 'Ya se refleja en tus métricas y gráficos.'
    )
    navigate('/ajustes')
  }

  return (
    <div className="mx-auto min-h-screen max-w-lg pb-32">
      <header className="glass sticky top-0 z-30 flex items-center gap-3 border-b border-line px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <button
          onClick={() => navigate('/ajustes')}
          aria-label="Volver"
          className="flex h-11 w-11 shrink-0 items-center justify-center text-ink-2"
        >
          <ArrowLeft size={22} />
        </button>
        <div className="flex items-center gap-2">
          <CalendarPlus size={18} className="text-accent" />
          <h1 className="font-semibold">Cargar entreno pasado</h1>
        </div>
      </header>

      <div className="space-y-5 px-4 py-4">
        <section>
          <SectionHeader title="Cuándo" />
          <Card>
            <div className="flex flex-col gap-2 p-4">
              <input
                type="date"
                value={date}
                max={todayInputValue()}
                onChange={(e) => setDate(e.target.value)}
                className="h-12 w-full rounded-sm bg-surface-2 px-3 text-[15px] outline-none focus:ring-1 focus:ring-accent"
              />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`Entreno del ${new Date(dateInputToIso(date)).toLocaleDateString('es-AR', { weekday: 'long' })}`}
                className="h-12 w-full rounded-sm bg-surface-2 px-3 text-[15px] outline-none placeholder:text-ink-3 focus:ring-1 focus:ring-accent"
              />
            </div>
          </Card>
        </section>

        <section>
          <SectionHeader title="Ejercicios" />
          {draftExercises.length === 0 ? (
            <EmptyState
              icon={<ListPlus size={28} />}
              title="Todavía no agregaste ninguno"
              description="Sumá los ejercicios que hiciste ese día, con sus series."
            />
          ) : (
            <div className="space-y-3">
              {draftExercises.map((ex) => {
                const exercise = exerciseMap.get(ex.exerciseId)
                const stepKg = WEIGHT_INCREMENT[exercise?.equipment ?? 'other']
                const displayStep = units === 'lbs' ? Math.max(1, Math.round(stepKg / 0.45359237)) : stepKg
                const weightLabel =
                  exercise && isBodyweight(exercise.equipment) ? 'Lastre' : units

                return (
                  <Card key={ex.exerciseId} className="px-3 py-3">
                    <div className="flex items-center justify-between gap-3 px-1 pb-2">
                      <h2 className="min-w-0 truncate font-semibold">
                        {exercise?.name ?? 'Ejercicio'}
                      </h2>
                      <button
                        onClick={() => handleRemoveExercise(ex.exerciseId)}
                        aria-label={`Quitar ${exercise?.name}`}
                        className="flex h-9 w-9 shrink-0 items-center justify-center text-danger/80"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="space-y-2">
                      {ex.sets.map((s, i) => (
                        <div key={i} className="flex items-center gap-2 px-1">
                          <span className="w-6 shrink-0 text-center font-mono text-sm font-bold text-ink-3">
                            {i + 1}
                          </span>
                          <div className="flex-1">
                            <NumberStepper
                              value={s.reps}
                              step={1}
                              min={1}
                              max={100}
                              decimals={0}
                              label="repeticiones"
                              onChange={(reps) => handleUpdateSet(ex.exerciseId, i, { reps })}
                            />
                          </div>
                          <div className="flex-1">
                            <NumberStepper
                              value={Number(formatWeight(s.weightKg, units))}
                              step={displayStep}
                              min={0}
                              decimals={1}
                              label={weightLabel.toLowerCase()}
                              onChange={(shown) =>
                                handleUpdateSet(ex.exerciseId, i, { weightKg: displayToKg(shown, units) })
                              }
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-2 flex gap-2 px-1">
                      <button
                        onClick={() => handleAddSet(ex.exerciseId)}
                        className="h-11 flex-1 rounded-sm bg-surface-2 text-sm font-medium text-ink-2 transition-colors active:bg-surface-3"
                      >
                        Agregar serie
                      </button>
                      <button
                        onClick={() => handleRemoveSet(ex.exerciseId)}
                        aria-label="Quitar la última serie"
                        className="h-11 rounded-sm bg-surface-2 px-4 text-sm font-medium text-danger/80 transition-colors active:bg-surface-3"
                      >
                        −
                      </button>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}

          <button
            onClick={() => setPickerOpen(true)}
            className="mt-3 h-14 w-full rounded-md border border-dashed border-line-2 font-semibold text-ink-2 transition-colors active:bg-surface"
          >
            Agregar ejercicio
          </button>
        </section>

        <button
          onClick={handleSave}
          disabled={draftExercises.length === 0 || saving}
          className="h-14 w-full rounded-md bg-accent text-[17px] font-bold text-bg transition-colors active:bg-accent-dim disabled:opacity-40"
        >
          Guardar entreno
        </button>
      </div>

      {pickerOpen && (
        <ExercisePicker
          onSelect={handleSelectExercise}
          onClose={() => setPickerOpen(false)}
          excludeIds={draftExercises.map((e) => e.exerciseId)}
        />
      )}
    </div>
  )
}
