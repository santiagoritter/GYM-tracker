import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Trash2, Trophy } from 'lucide-react'
import { db } from '@/db/schema'
import { workoutSetsOf, workoutsFor, personalRecordsFor } from '@/db/scoped'
import { useWorkoutStore } from '@/stores/workoutStore'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { ExercisePicker } from '@/components/gym/ExercisePicker'
import { RestTimer } from '@/components/gym/RestTimer'
import ExerciseCard from '@/components/gym/ExerciseCard'
import ExerciseDetailSheet from '@/components/gym/ExerciseDetailSheet'
import Confetti from '@/components/ui/Confetti'
import AchievementIcon from '@/components/gym/AchievementIcon'
import type { Exercise, PersonalRecord, WorkoutSet } from '@/types'
import { formatDuration, formatWeight } from '@/lib/utils'
import { hapticSuccess, hapticTick } from '@/lib/native'
import { computeStats } from '@/lib/stats'
import { syncAchievements, type AchievementDef } from '@/lib/achievements'
import { toast } from '@/stores/toastStore'
import { getRandomMessage, WORKOUT_COMPLETE_MESSAGES } from '@/lib/motivational'
import { groupExerciseUnits, defaultActiveUnitKey, unitKeyForExercise } from '@/lib/workoutUnits'
import { computeVolumeKg, previewPRs, workingSetsOf, type PRPreviewItem } from '@/lib/workoutSummary'

type WorkoutScreen =
  | { kind: 'active' }
  | { kind: 'preview'; volumeKg: number; prPreview: PRPreviewItem[] }
  | { kind: 'results'; prs: PersonalRecord[]; achievements: AchievementDef[] }

export default function Workout() {
  const { workoutId } = useParams<{ workoutId: string }>()
  const navigate = useNavigate()
  const store = useWorkoutStore()
  const userId = useCurrentUserId()
  const [pickerOpen, setPickerOpen] = useState(false)
  // Mismo sheet de detalle que Exercises.tsx (técnica, músculos, foto de
  // referencia) — repasar la técnica de lo que se está haciendo ahora
  // mismo no debería obligar a salir del entreno.
  const [infoExercise, setInfoExercise] = useState<Exercise | null>(null)
  const [elapsed, setElapsed] = useState('')
  const [screen, setScreen] = useState<WorkoutScreen>({ kind: 'active' })
  const [isFinishing, setIsFinishing] = useState(false)
  // Qué serie muestra los steppers grandes. null = la serie activa (primera
  // sin completar), que es lo que uno quiere el 90% de las veces.
  const [editingSetId, setEditingSetId] = useState<string | null>(null)
  // Qué EJERCICIO (o par en superserie) está expandido. null = sin
  // elección explícita, usar el default (primero con series pendientes) —
  // mismo patrón que editingSetId. Se pinea al tocar completar una serie
  // (ver handleCompleteSet) para que la tarjeta no colapse sola apenas se
  // cierra su última serie pendiente.
  const [activeUnitKey, setActiveUnitKey] = useState<string | null>(null)

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

  // Ejercicio suelto o par en superserie: la unidad que se colapsa/expande
  // junta (ver lib/workoutUnits.ts).
  const exerciseUnits = useMemo(() => groupExerciseUnits(grouped), [grouped])
  const defaultActiveKey = useMemo(
    () => defaultActiveUnitKey(exerciseUnits),
    [exerciseUnits]
  )
  const activePinned =
    activeUnitKey !== null && exerciseUnits.some((u) => u.key === activeUnitKey)
  const effectiveActiveKey = activePinned ? activeUnitKey : defaultActiveKey

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
    // Pinea la unidad activa a la del set que se está tocando — sin esto,
    // completar la última serie pendiente de la unidad activa hace que el
    // default salte a otra unidad en el mismo render, y la tarjeta con el
    // picker de RPE recién aparecido colapsa debajo del dedo.
    setActiveUnitKey(unitKeyForExercise(exerciseUnits, s.exerciseId) ?? s.exerciseId)

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

  // Calcula todo en memoria, sin tocar Dexie, y muestra la vista previa —
  // el guardado real recién pasa cuando se confirma (handleConfirmFinish).
  const handleRequestFinish = async () => {
    if (!userId) return
    const volumeKg = computeVolumeKg(sets ?? [])
    const prPreview = await previewPRs(userId, sets ?? [])
    setScreen({ kind: 'preview', volumeKg, prPreview })
  }

  const handleConfirmFinish = async () => {
    if (!userId || isFinishing) return
    setIsFinishing(true)
    const prs = await store.finishWorkout(userId, workoutId)
    hapticSuccess()

    const [workouts, prCount] = await Promise.all([
      workoutsFor(userId).toArray(),
      personalRecordsFor(userId).count(),
    ])
    const stats = computeStats(workouts)
    const unlocked = await syncAchievements(userId, { stats, prCount })
    setScreen({ kind: 'results', prs, achievements: unlocked })
    setIsFinishing(false)

    const msg = getRandomMessage(WORKOUT_COMPLETE_MESSAGES)
    toast.success('¡Entreno completado!', msg.text)
    for (const pr of prs) {
      toast.pr('Nuevo récord', `${exerciseMap.get(pr.exerciseId)?.name}: ${pr.weightKg} kg × ${pr.reps}`)
    }
    for (const a of unlocked) {
      toast.pr(`Logro: ${a.name}`, a.description)
    }
  }

  const handleCancelPreview = () => setScreen({ kind: 'active' })

  const handleDiscard = async () => {
    if (confirm('¿Descartar este entreno? Se pierden todos los sets.')) {
      await store.discardWorkout(workoutId)
      navigate('/')
    }
  }

  // Pantalla de resumen post-finalización (sin cambios respecto a antes,
  // solo lee del nuevo screen.kind === 'results' en vez de newPRs)
  if (screen.kind === 'results') {
    const celebrate = screen.prs.length > 0 || screen.achievements.length > 0
    return (
      <div className="mx-auto flex min-h-screen content-width flex-col items-center justify-center gap-6 px-6 py-10 text-center">
        {celebrate && <Confetti />}
        <h1 className="text-3xl font-bold">Entreno terminado</h1>

        {screen.achievements.length > 0 && (
          <div className="w-full space-y-2">
            {screen.achievements.map((a, i) => (
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

        {screen.prs.length > 0 ? (
          <div className="w-full space-y-3">
            {screen.prs.map((pr, i) => (
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

  // Vista previa antes de guardar: nada se persiste todavía, "Volver"
  // descarta la preview sin tocar Dexie.
  if (screen.kind === 'preview') {
    const noWorkingSets = workingSetsOf(sets ?? []).length === 0
    return (
      <div className="mx-auto flex min-h-screen content-width flex-col gap-6 px-6 py-10">
        <h1 className="text-center text-3xl font-bold">Revisá tu entreno</h1>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-surface p-4 text-center">
            <p className="font-mono text-2xl font-bold tabular-nums">{elapsed}</p>
            <p className="mt-1 text-[13px] text-ink-3">Duración</p>
          </div>
          <div className="rounded-2xl bg-surface p-4 text-center">
            <p className="font-mono text-2xl font-bold tabular-nums">
              {screen.volumeKg > 0 ? `${formatWeight(screen.volumeKg, units)} ${units}` : '—'}
            </p>
            <p className="mt-1 text-[13px] text-ink-3">Volumen</p>
          </div>
        </div>

        {noWorkingSets && (
          <p className="text-center text-[14px] text-ink-2">
            Sin series completadas todavía — igual se puede guardar.
          </p>
        )}

        {screen.prPreview.length > 0 && (
          <div className="space-y-2">
            {screen.prPreview.map((pr) => (
              <div
                key={pr.exerciseId}
                className="animate-fade-up rounded-2xl border border-accent/40 bg-accent/10 p-4"
              >
                <p className="flex items-center gap-2 text-sm font-bold text-accent">
                  <Trophy size={16} /> PR si confirmás
                </p>
                <p className="mt-1 font-medium">{exerciseMap.get(pr.exerciseId)?.name}</p>
                <p className="font-mono text-2xl font-bold">
                  {pr.weightKg} kg × {pr.reps}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-auto space-y-2">
          <button
            onClick={handleConfirmFinish}
            disabled={isFinishing}
            className="h-14 w-full rounded-md bg-accent text-[17px] font-bold text-bg transition-colors active:bg-accent-dim disabled:opacity-60"
          >
            Confirmar
          </button>
          <button
            onClick={handleCancelPreview}
            disabled={isFinishing}
            className="h-14 w-full rounded-md border border-line-2 font-semibold text-ink-2 transition-colors active:bg-surface disabled:opacity-60"
          >
            Volver
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto min-h-screen content-width pb-40">
      <header className="glass sticky top-0 z-30 flex items-center justify-between border-b border-line px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
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
        {exerciseUnits.flatMap((unit) =>
          unit.members.map((m) => (
            <ExerciseCard
              key={m.exercise?.id ?? 'unknown'}
              exercise={m.exercise}
              sets={m.sets}
              units={units}
              isSuperset={unit.supersetGroup !== undefined}
              expanded={effectiveActiveKey === unit.key}
              onExpand={() => setActiveUnitKey(unit.key)}
              editingSetId={editingSetId}
              onEditSet={setEditingSetId}
              onCompleteSet={handleCompleteSet}
              onUpdateSet={(setId, patch) => store.updateSet(setId, patch)}
              onAddSet={() => store.addSet(workoutId, m.exercise!.id)}
              onRemoveSet={() => store.removeSet(m.sets[m.sets.length - 1].id)}
              onEqualizeSets={() => applyFirstSetToRest(m.sets)}
              onShowInfo={() => m.exercise && setInfoExercise(m.exercise)}
            />
          ))
        )}

        <button
          onClick={() => setPickerOpen(true)}
          className="h-14 w-full rounded-md border border-line-2 py-4 font-semibold text-ink-2 transition-colors active:bg-surface"
        >
          Agregar ejercicio
        </button>

        {grouped.length > 0 && (
          <button
            onClick={handleRequestFinish}
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

      <ExerciseDetailSheet exercise={infoExercise} onClose={() => setInfoExercise(null)} />
    </div>
  )
}
