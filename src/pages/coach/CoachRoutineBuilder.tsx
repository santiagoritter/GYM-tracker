import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowDown, ArrowLeft, ArrowUp, Moon, Plus, Trash2, X } from 'lucide-react'
import { db } from '@/db/schema'
import { routinesFor } from '@/db/scoped'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { ROUTINE_TEMPLATES } from '@/data/routineTemplates'
import { buildPayload } from '@/lib/qr'
import { fetchClientRoutineDraft } from '@/lib/coachQueries'
import { saveCoachRoutine } from '@/lib/coachMutations'
import {
  DRAFT_LIMITS,
  emptyDraft,
  newDay,
  newExercise,
  payloadToDraft,
  validateDraft,
  type DraftDay,
  type DraftExercise,
  type RoutineDraft,
} from '@/lib/coachRoutineDraft'
import { REST_OPTIONS } from '@/lib/constants'
import { toast } from '@/stores/toastStore'
import { cn } from '@/lib/utils'
import type { Exercise } from '@/types'
import { ExercisePicker } from '@/components/gym/ExercisePicker'
import { Card, Row, SectionHeader } from '@/components/ui/Card'
import DraftNumberInput from '@/components/ui/DraftNumberInput'

function move<T>(arr: T[], index: number, dir: -1 | 1): T[] {
  const to = index + dir
  if (to < 0 || to >= arr.length) return arr
  const next = [...arr]
  ;[next[index], next[to]] = [next[to]!, next[index]!]
  return next
}

/**
 * Constructor de rutinas del coach para un alumno: `/coach/alumno/:id/rutina`
 * (nueva) y `/coach/alumno/:id/rutina/:routineId` (editar una que él asignó).
 * El borrador vive en memoria y se guarda de una vez por RPC atómica; nada se
 * escribe a medias. Punto de partida al crear: desde cero, plantilla o una
 * rutina propia del coach.
 */
export default function CoachRoutineBuilder() {
  const { id: clientId = '', routineId } = useParams()
  const navigate = useNavigate()
  const meId = useCurrentUserId()
  const [draft, setDraft] = useState<RoutineDraft | null>(null)
  const [loading, setLoading] = useState(Boolean(routineId))
  const [saving, setSaving] = useState(false)
  const [pickerDay, setPickerDay] = useState<string | null>(null)
  const isEditing = Boolean(routineId)

  const exercises = useLiveQuery(() => db.exercises.toArray(), []) ?? []
  const exerciseMap = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises])
  const ownRoutines = useLiveQuery(
    () => (meId ? routinesFor(meId).filter((r) => r.isArchived === 0).toArray() : []),
    [meId]
  ) ?? []

  const backToClient = () => navigate(`/coach/alumno/${clientId}`)

  useEffect(() => {
    if (!routineId) return
    let cancelled = false
    fetchClientRoutineDraft(clientId, routineId)
      .then((d) => {
        if (cancelled) return
        if (!d) {
          toast.error('No se encontró la rutina', 'Puede que ya la hayas retirado.')
          backToClient()
          return
        }
        setDraft(d)
      })
      .catch((e: unknown) => {
        if (!cancelled) toast.error('No se pudo cargar', e instanceof Error ? e.message : 'Error')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, routineId])

  const patchDay = (key: string, patch: Partial<DraftDay>) =>
    setDraft((d) => d && { ...d, days: d.days.map((x) => (x.key === key ? { ...x, ...patch } : x)) })

  const patchExercise = (dayKey: string, exKey: string, patch: Partial<DraftExercise>) =>
    setDraft(
      (d) =>
        d && {
          ...d,
          days: d.days.map((day) =>
            day.key !== dayKey
              ? day
              : { ...day, exercises: day.exercises.map((e) => (e.key === exKey ? { ...e, ...patch } : e)) }
          ),
        }
    )

  const addExercise = (exercise: Exercise) => {
    const dayKey = pickerDay
    setPickerDay(null)
    if (!dayKey) return
    setDraft(
      (d) =>
        d && {
          ...d,
          days: d.days.map((day) =>
            day.key !== dayKey || day.exercises.length >= DRAFT_LIMITS.exercisesPerDay
              ? day
              : { ...day, exercises: [...day.exercises, newExercise(exercise.id)] }
          ),
        }
    )
  }

  const save = async () => {
    if (!draft || saving) return
    const problem = validateDraft(draft)
    if (problem) return toast.error('Revisá la rutina', problem)
    setSaving(true)
    try {
      await saveCoachRoutine(clientId, routineId ?? null, draft)
      toast.success(isEditing ? 'Rutina actualizada' : 'Rutina asignada', 'El alumno la ve en "Mis rutinas" en su próximo sync.')
      backToClient()
    } catch (e) {
      toast.error('No se pudo guardar', e instanceof Error ? e.message : 'Error')
      setSaving(false)
    }
  }

  const startFromOwn = async (routineIdToCopy: string) => {
    const routine = ownRoutines.find((r) => r.id === routineIdToCopy)
    if (!routine) return
    try {
      setDraft(payloadToDraft(await buildPayload(routine, { includeWeights: false })))
    } catch (e) {
      toast.error('No se pudo copiar', e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <div className="mx-auto min-h-screen content-width pb-32 lg:max-w-3xl">
      <header className="glass sticky top-0 z-30 flex items-center gap-3 border-b border-line px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <button
          onClick={backToClient}
          aria-label="Volver"
          className="flex h-11 w-11 shrink-0 items-center justify-center text-ink-2"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="min-w-0 flex-1 truncate font-semibold">
          {isEditing ? 'Editar rutina' : 'Nueva rutina'}
        </h1>
      </header>

      {loading && <p className="py-12 text-center text-sm text-ink-3">Cargando…</p>}

      {!loading && !draft && (
        <div className="space-y-5 px-4 py-4">
          <p className="text-[14px] text-ink-2">¿Cómo querés empezar?</p>
          <button
            onClick={() => setDraft(emptyDraft())}
            className="flex h-14 w-full items-center gap-3 rounded-md bg-surface px-4 text-left active:bg-surface-2"
          >
            <Plus size={20} className="text-accent" />
            <span className="font-semibold">Desde cero</span>
          </button>

          <section>
            <SectionHeader title="Desde una plantilla" />
            <Card>
              {ROUTINE_TEMPLATES.map((t) => (
                <Row key={t.id} onClick={() => setDraft(payloadToDraft(t.payload))}>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium">{t.name}</p>
                    <p className="text-[13px] text-ink-3">
                      {t.subtitle} · {t.level}
                    </p>
                  </div>
                </Row>
              ))}
            </Card>
          </section>

          {ownRoutines.length > 0 && (
            <section>
              <SectionHeader title="Desde una de tus rutinas" />
              <Card>
                {ownRoutines.map((r) => (
                  <Row key={r.id} onClick={() => startFromOwn(r.id)}>
                    <p className="min-w-0 flex-1 truncate text-[15px] font-medium">{r.name}</p>
                  </Row>
                ))}
              </Card>
            </section>
          )}
        </div>
      )}

      {draft && (
        <div className="space-y-5 px-4 py-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-2">Nombre de la rutina</label>
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              maxLength={80}
              placeholder="Ej: Fuerza 4 días"
              className="h-12 w-full rounded-sm bg-surface px-4 text-[15px] outline-none ring-1 ring-line-2 focus:ring-accent"
            />
          </div>

          {draft.days.map((day, dayIndex) => (
            <section key={day.key}>
              <Card>
                <Row>
                  <input
                    value={day.name}
                    onChange={(e) => patchDay(day.key, { name: e.target.value })}
                    maxLength={60}
                    aria-label="Nombre del día"
                    className="h-11 min-w-0 flex-1 bg-transparent font-semibold outline-none"
                  />
                  <IconButton
                    label="Subir día"
                    disabled={dayIndex === 0}
                    onClick={() => setDraft({ ...draft, days: move(draft.days, dayIndex, -1) })}
                  >
                    <ArrowUp size={16} />
                  </IconButton>
                  <IconButton
                    label="Bajar día"
                    disabled={dayIndex === draft.days.length - 1}
                    onClick={() => setDraft({ ...draft, days: move(draft.days, dayIndex, 1) })}
                  >
                    <ArrowDown size={16} />
                  </IconButton>
                  <IconButton
                    label="Marcar como día de descanso"
                    active={day.isRest}
                    onClick={() => patchDay(day.key, { isRest: !day.isRest })}
                  >
                    <Moon size={18} />
                  </IconButton>
                  <IconButton
                    label="Eliminar día"
                    disabled={draft.days.length === 1}
                    onClick={() => {
                      if (confirm(`¿Eliminar "${day.name}"?`))
                        setDraft({ ...draft, days: draft.days.filter((x) => x.key !== day.key) })
                    }}
                  >
                    <Trash2 size={18} />
                  </IconButton>
                </Row>

                {day.isRest ? (
                  <Row>
                    <p className="text-[14px] text-ink-3">Día de descanso</p>
                  </Row>
                ) : (
                  day.exercises.map((ex, exIndex) => (
                    <ExerciseRow
                      key={ex.key}
                      ex={ex}
                      exercise={exerciseMap.get(ex.exerciseId)}
                      isFirst={exIndex === 0}
                      isLast={exIndex === day.exercises.length - 1}
                      onChange={(patch) => patchExercise(day.key, ex.key, patch)}
                      onMove={(dir) => patchDay(day.key, { exercises: move(day.exercises, exIndex, dir) })}
                      onRemove={() =>
                        patchDay(day.key, { exercises: day.exercises.filter((x) => x.key !== ex.key) })
                      }
                    />
                  ))
                )}
              </Card>
              {!day.isRest && (
                <button
                  onClick={() => setPickerDay(day.key)}
                  disabled={day.exercises.length >= DRAFT_LIMITS.exercisesPerDay}
                  className="mt-2 flex h-11 w-full items-center justify-center gap-1.5 rounded-sm border border-dashed border-line-2 text-sm font-medium text-ink-2 active:bg-surface disabled:opacity-40"
                >
                  <Plus size={16} /> Agregar ejercicio
                </button>
              )}
            </section>
          ))}

          {draft.days.length < DRAFT_LIMITS.days && (
            <button
              onClick={() => setDraft({ ...draft, days: [...draft.days, newDay(`Día ${draft.days.length + 1}`)] })}
              className="flex h-12 w-full items-center justify-center gap-1.5 rounded-sm bg-fill text-sm font-semibold text-ink-2 active:bg-fill-2"
            >
              <Plus size={16} /> Agregar día
            </button>
          )}
        </div>
      )}

      {draft && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
          <div className="mx-auto content-width lg:max-w-3xl">
            <button
              onClick={save}
              disabled={saving}
              className="h-12 w-full rounded-sm bg-accent text-sm font-bold text-bg active:bg-accent-dim disabled:opacity-50"
            >
              {saving ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Asignar al alumno'}
            </button>
          </div>
        </div>
      )}

      {pickerDay && <ExercisePicker onSelect={addExercise} onClose={() => setPickerDay(null)} />}
    </div>
  )
}

function IconButton({
  label,
  onClick,
  disabled,
  active,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        'flex h-11 w-10 shrink-0 items-center justify-center disabled:opacity-30',
        active ? 'text-info' : 'text-ink-3'
      )}
    >
      {children}
    </button>
  )
}

const NUM =
  'h-11 w-14 rounded-xs bg-surface-2 text-center font-mono font-bold tabular-nums outline-none focus:ring-1 focus:ring-accent'

function ExerciseRow({
  ex,
  exercise,
  isFirst,
  isLast,
  onChange,
  onMove,
  onRemove,
}: {
  ex: DraftExercise
  exercise?: Exercise
  isFirst: boolean
  isLast: boolean
  onChange: (patch: Partial<DraftExercise>) => void
  onMove: (dir: -1 | 1) => void
  onRemove: () => void
}) {
  const customRest = !REST_OPTIONS.includes(ex.restSeconds)
  const [customOpen, setCustomOpen] = useState(customRest)

  return (
    <Row className="flex-col items-stretch gap-1">
      <div className="flex w-full items-center justify-between gap-2">
        <p className="min-w-0 flex-1 truncate font-medium">{exercise?.name ?? 'Ejercicio'}</p>
        <div className="flex shrink-0 items-center">
          <IconButton label="Mover arriba" disabled={isFirst} onClick={() => onMove(-1)}>
            <ArrowUp size={16} />
          </IconButton>
          <IconButton label="Mover abajo" disabled={isLast} onClick={() => onMove(1)}>
            <ArrowDown size={16} />
          </IconButton>
          <IconButton label="Quitar ejercicio" onClick={onRemove}>
            <X size={16} />
          </IconButton>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex items-center gap-2 text-[14px] text-ink-2">
          Series
          <DraftNumberInput
            value={ex.sets}
            onCommit={(n) => onChange({ sets: Math.min(DRAFT_LIMITS.sets, Math.max(1, Math.round(n))) })}
            className={NUM}
          />
        </label>
        <label className="flex items-center gap-2 text-[14px] text-ink-2">
          Reps
          <DraftNumberInput
            value={ex.repsMin}
            onCommit={(n) => onChange({ repsMin: Math.min(DRAFT_LIMITS.reps, Math.max(1, Math.round(n))) })}
            className={NUM}
          />
          <span className="text-ink-3">–</span>
          <DraftNumberInput
            value={ex.repsMax}
            onCommit={(n) => onChange({ repsMax: Math.min(DRAFT_LIMITS.reps, Math.max(1, Math.round(n))) })}
            className={NUM}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {REST_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => {
              setCustomOpen(false)
              onChange({ restSeconds: s })
            }}
            className={cn(
              'flex h-11 items-center rounded-xs px-3 font-mono text-[13px] tabular-nums',
              !customOpen && ex.restSeconds === s ? 'bg-accent text-bg' : 'bg-surface-2 text-ink-3'
            )}
          >
            {s}s
          </button>
        ))}
        <button
          onClick={() => setCustomOpen((v) => !v)}
          className={cn(
            'flex h-11 items-center rounded-xs px-3 text-[13px]',
            customOpen ? 'bg-accent text-bg' : 'bg-surface-2 text-ink-3'
          )}
        >
          Otro
        </button>
        {customOpen && (
          <span className="flex items-center gap-1">
            <DraftNumberInput
              value={ex.restSeconds}
              onCommit={(n) => onChange({ restSeconds: Math.min(DRAFT_LIMITS.restMax, Math.max(5, Math.round(n))) })}
              className={NUM}
            />
            <span className="text-[13px] text-ink-3">s</span>
          </span>
        )}
      </div>

      <input
        value={ex.notes}
        onChange={(e) => onChange({ notes: e.target.value })}
        maxLength={300}
        placeholder="Indicación para el alumno (opcional)"
        aria-label="Indicación para el alumno"
        className="h-11 w-full rounded-xs bg-surface-2 px-3 text-[14px] outline-none focus:ring-1 focus:ring-accent"
      />
    </Row>
  )
}
