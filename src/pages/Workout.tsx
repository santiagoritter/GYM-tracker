import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Check, CopyCheck, Trash2, Trophy } from 'lucide-react'
import { db } from '@/db/schema'
import { workoutSetsOf, workoutsFor, personalRecordsFor } from '@/db/scoped'
import { useWorkoutStore } from '@/stores/workoutStore'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { ExercisePicker } from '@/components/gym/ExercisePicker'
import { RestTimer } from '@/components/gym/RestTimer'
import { MuscleChip } from '@/components/gym/MuscleChip'
import Confetti from '@/components/ui/Confetti'
import NumberStepper from '@/components/ui/NumberStepper'
import { Card } from '@/components/ui/Card'
import AchievementIcon from '@/components/gym/AchievementIcon'
import type { Exercise, PersonalRecord, WorkoutSet } from '@/types'
import { cn, displayToKg, formatDuration, formatWeight } from '@/lib/utils'
import { WEIGHT_INCREMENT, isBodyweight } from '@/lib/loading'
import { hapticSuccess, hapticTick } from '@/lib/native'
import { computeStats } from '@/lib/stats'
import { syncAchievements, type AchievementDef } from '@/lib/achievements'
import { toast } from '@/stores/toastStore'
import { getRandomMessage, WORKOUT_COMPLETE_MESSAGES } from '@/lib/motivational'

export default function Workout() {
  const { workoutId } = useParams<{ workoutId: string }>()
  const navigate = useNavigate()
  const store = useWorkoutStore()
  const userId = useCurrentUserId()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [elapsed, setElapsed] = useState('')
  const [newPRs, setNewPRs] = useState<PersonalRecord[] | null>(null)
  const [newAchievements, setNewAchievements] = useState<AchievementDef[]>([])
  // Qué serie muestra los steppers grandes. null = la serie activa (primera
  // sin completar), que es lo que uno quiere el 90% de las veces.
  const [editingSetId, setEditingSetId] = useState<string | null>(null)

  const workout = useLiveQuery(
    () => (workoutId ? db.workouts.get(workoutId) : undefined),
    [workoutId]
  )
  const sets = useLiveQuery(
    () => (workoutId ? workoutSetsOf(workoutId).toArray() : []),
    [workoutId]
  )
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) ?? []
  const profile = useLiveQuery(
    () => (userId ? db.profile.get(userId) : undefined),
    [userId]
  )

  const exerciseMap = useMemo(
    () => new Map(exercises.map((e) => [e.id, e])),
    [exercises]
  )

  // Agrupar sets por ejercicio, en orden de aparición
  const grouped = useMemo(() => {
    const order: string[] = []
    const map = new Map<string, WorkoutSet[]>()
    for (const s of (sets ?? []).sort((a, b) => a.setNumber - b.setNumber)) {
      if (!map.has(s.exerciseId)) {
        map.set(s.exerciseId, [])
        order.push(s.exerciseId)
      }
      map.get(s.exerciseId)!.push(s)
    }
    return order.map((id) => ({ exercise: exerciseMap.get(id), sets: map.get(id)! }))
  }, [sets, exerciseMap])

  const units = profile?.units ?? 'kg'

  /**
   * Copia reps y peso de la primera serie a todas las que faltan completar.
   * Las ya completadas no se tocan: son un registro de lo que pasó.
   */
  const applyFirstSetToRest = (exSets: WorkoutSet[]) => {
    const [first, ...rest] = exSets
    if (!first) return
    for (const s of rest) {
      if (s.completed === 1) continue
      if (s.reps === first.reps && s.weightKg === first.weightKg) continue
      store.updateSet(s.id, { reps: first.reps, weightKg: first.weightKg })
    }
  }

  useEffect(() => {
    if (!workout) return
    const tick = () => setElapsed(formatDuration(workout.startedAt))
    tick()
    const i = setInterval(tick, 1000)
    return () => clearInterval(i)
  }, [workout])

  if (!workoutId) return null

  const handleSelectExercise = (exercise: Exercise) => {
    store.addExercise(workoutId, exercise.id)
    setPickerOpen(false)
  }

  const handleCompleteSet = (s: WorkoutSet) => {
    const next = s.completed === 1 ? 0 : 1
    store.updateSet(s.id, { completed: next as 0 | 1 })
    if (next !== 1) return
    hapticTick()

    // En superserie: sin descanso hasta cerrar la vuelta (cuando el compañero
    // del grupo todavía tiene pendiente la serie del mismo número)
    if (s.supersetGroup !== undefined) {
      const partnerPending = (sets ?? []).some(
        (other) =>
          other.id !== s.id &&
          other.supersetGroup === s.supersetGroup &&
          other.exerciseId !== s.exerciseId &&
          other.setNumber === s.setNumber &&
          other.completed === 0
      )
      if (partnerPending) return
    }
    store.startRest(profile?.restTimerDefault ?? 90)
  }

  const handleFinish = async () => {
    if (!userId) return
    const prs = await store.finishWorkout(userId, workoutId)
    hapticSuccess()
    setNewPRs(prs)

    // Métricas + logros a partir del estado ya persistido
    const [workouts, prCount] = await Promise.all([
      workoutsFor(userId).toArray(),
      personalRecordsFor(userId).count(),
    ])
    const stats = computeStats(workouts)
    const unlocked = await syncAchievements(userId, { stats, prCount })
    setNewAchievements(unlocked)

    // Feedback: toasts encadenados
    const msg = getRandomMessage(WORKOUT_COMPLETE_MESSAGES)
    toast.success('¡Entreno completado!', msg.text)
    for (const pr of prs) {
      toast.pr('Nuevo récord', `${exerciseMap.get(pr.exerciseId)?.name}: ${pr.weightKg} kg × ${pr.reps}`)
    }
    for (const a of unlocked) {
      toast.pr(`Logro: ${a.name}`, a.description)
    }
  }

  const handleDiscard = async () => {
    if (confirm('¿Descartar este entreno? Se pierden todos los sets.')) {
      await store.discardWorkout(workoutId)
      navigate('/')
    }
  }

  // Pantalla de resumen post-finalización
  if (newPRs !== null) {
    const celebrate = newPRs.length > 0 || newAchievements.length > 0
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-6 px-6 py-10 text-center">
        {celebrate && <Confetti />}
        <h1 className="text-3xl font-bold">Entreno terminado</h1>

        {newAchievements.length > 0 && (
          <div className="w-full space-y-2">
            {newAchievements.map((a, i) => (
              <div
                key={a.id}
                style={{ animationDelay: `${i * 120}ms` }}
                className="animate-pr-appear flex items-center gap-3 rounded-2xl border border-accent/40 bg-accent/10 p-3 text-left"
              >
                <span className="shrink-0 text-accent">
                  <AchievementIcon name={a.icon} size={24} />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-accent">Logro desbloqueado</p>
                  <p className="font-semibold">{a.name}</p>
                  <p className="text-xs text-ink-2">{a.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {newPRs.length > 0 ? (
          <div className="w-full space-y-3">
            {newPRs.map((pr, i) => (
              <div
                key={pr.id}
                style={{ animationDelay: `${i * 120}ms` }}
                className="animate-pr-appear rounded-2xl border border-accent/40 bg-accent/10 p-4"
              >
                <p className="flex items-center justify-center gap-2 text-sm font-bold text-accent">
                  <Trophy size={16} /> NUEVO PR
                </p>
                <p className="mt-1 font-medium">{exerciseMap.get(pr.exerciseId)?.name}</p>
                <p className="font-mono text-2xl font-bold">
                  {pr.weightKg} kg × {pr.reps}
                </p>
                <p className="text-xs text-ink-2">1RM estimado: {pr.oneRmKg} kg</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-ink-2">Sin PRs nuevos esta vez. La constancia gana igual.</p>
        )}
        <button
          onClick={() => navigate('/')}
          className="w-full rounded-xl bg-accent py-4 font-bold text-bg"
        >
          Volver al inicio
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto min-h-screen max-w-lg pb-40">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-bg/95 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur">
        <button onClick={() => navigate('/')} className="p-2 text-ink-2">
          <ArrowLeft size={22} />
        </button>
        <div className="text-center">
          <p className="text-sm font-medium">{workout?.name}</p>
          <p className="font-mono text-xs text-accent">{elapsed}</p>
        </div>
        <button onClick={handleDiscard} className="p-2 text-danger/70">
          <Trash2 size={20} />
        </button>
      </header>

      <div className="space-y-4 px-4 py-4">
        {grouped.map(({ exercise, sets: exSets }) => (
          <Card key={exercise?.id ?? 'unknown'} as="section" className="px-3 pb-3">
            <div className="flex items-start justify-between gap-3 border-b border-line-2 px-1 py-3.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="truncate font-semibold">{exercise?.name ?? 'Ejercicio'}</h2>
                  {exSets[0]?.supersetGroup !== undefined && (
                    <span className="shrink-0 rounded-xs bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-accent">
                      SS
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {exercise?.musclePrimary.map((m) => <MuscleChip key={m} muscle={m} />)}
                </div>
              </div>
              <span
                className={cn(
                  'shrink-0 font-mono text-[15px] font-bold tabular-nums',
                  exSets.every((s) => s.completed === 1) ? 'text-success' : 'text-ink-3'
                )}
              >
                {exSets.filter((s) => s.completed === 1).length}/{exSets.length}
              </span>
            </div>

            <div className="grid grid-cols-[2rem_1fr_1fr_2.75rem] gap-2 px-1 pb-1 pt-2.5 text-[12px] font-medium text-ink-3">
              <span>#</span>
              <span className="text-center">Reps</span>
              <span className="text-center">
                {exercise && isBodyweight(exercise.equipment) ? 'Lastre' : units}
              </span>
              <span />
            </div>

            {exSets.map((s) => (
              <SetRow
                key={s.id}
                set={s}
                equipment={exercise?.equipment ?? 'other'}
                units={units}
                isActive={s.id === exSets.find((x) => x.completed === 0)?.id}
                expanded={
                  editingSetId === s.id ||
                  (editingSetId === null && s.id === exSets.find((x) => x.completed === 0)?.id)
                }
                onExpand={() => setEditingSetId(s.id)}
                onComplete={() => handleCompleteSet(s)}
                onUpdate={(patch) => store.updateSet(s.id, patch)}
              />
            ))}

            <div className="mt-2 flex gap-2">
              <button
                onClick={() => store.addSet(workoutId, exercise!.id)}
                className="h-11 flex-1 rounded-sm bg-surface-2 text-sm font-medium text-ink-2 transition-colors active:bg-surface-3"
              >
                Agregar serie
              </button>
              {/* Igualar evita el peor caso del stepper: cambiar el peso en
                  4 series es repetir el mismo viaje 4 veces. */}
              {exSets.length > 1 && (
                <button
                  onClick={() => applyFirstSetToRest(exSets)}
                  className="flex h-11 items-center gap-1.5 rounded-sm bg-surface-2 px-3.5 text-sm font-medium text-ink-2 transition-colors active:bg-surface-3"
                  title="Copiar reps y peso de la 1ª serie a las que faltan"
                >
                  <CopyCheck size={15} /> Igualar
                </button>
              )}
              {exSets.length > 0 && (
                <button
                  onClick={() => store.removeSet(exSets[exSets.length - 1].id)}
                  aria-label="Quitar la última serie"
                  className="h-11 rounded-sm bg-surface-2 px-4 text-sm font-medium text-danger/80 transition-colors active:bg-surface-3"
                >
                  −
                </button>
              )}
            </div>
          </Card>
        ))}

        <button
          onClick={() => setPickerOpen(true)}
          className="h-14 w-full rounded-md border border-line-2 py-4 font-semibold text-ink-2 transition-colors active:bg-surface"
        >
          Agregar ejercicio
        </button>

        {grouped.length > 0 && (
          <button
            onClick={handleFinish}
            className="h-14 w-full rounded-md bg-accent text-[17px] font-bold text-bg transition-colors active:bg-accent-dim"
          >
            Finalizar entreno
          </button>
        )}
      </div>

      {pickerOpen && (
        <ExercisePicker
          onSelect={handleSelectExercise}
          onClose={() => setPickerOpen(false)}
          excludeIds={grouped.map((g) => g.exercise?.id ?? '')}
        />
      )}
      <RestTimer />
    </div>
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
        'px-1 transition-colors',
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
      <div className="grid grid-cols-[2rem_1fr_1fr_2.75rem] items-center gap-2">
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

        <button
          onClick={onComplete}
          aria-label={set.completed === 1 ? 'Desmarcar serie' : 'Completar serie'}
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-lg border transition-colors',
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

