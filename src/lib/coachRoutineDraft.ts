import type { QRPayload } from '@/lib/qr'
import { uid } from '@/lib/utils'

/**
 * Borrador de una rutina que el coach arma para un alumno. Vive en memoria
 * mientras se edita y recién se manda al servidor al guardar (RPC atómica
 * `coach_upsert_routine`, migración 0021). Los `key` son ids de UI estables
 * (nunca el índice del array); los `id` son los de la fila en el servidor y
 * solo existen al editar una rutina ya guardada.
 */

export interface DraftExercise {
  key: string
  id?: string
  exerciseId: string
  sets: number
  repsMin: number
  repsMax: number
  restSeconds: number
  notes: string
  /** Mismo número = mismo superset (ver types/index.ts). Faltaba acá: el
   * borrador nunca la leía de vuelta ni la mandaba a la RPC, así que
   * editar una rutina con superseries las perdía al guardar. */
  supersetGroup?: number
}

export interface DraftDay {
  key: string
  id?: string
  name: string
  isRest: boolean
  exercises: DraftExercise[]
}

export interface RoutineDraft {
  name: string
  days: DraftDay[]
}

export const DRAFT_LIMITS = { days: 14, exercisesPerDay: 30, sets: 20, reps: 100, restMax: 900 } as const

export function newDay(name: string): DraftDay {
  return { key: uid(), name, isRest: false, exercises: [] }
}

export function newExercise(exerciseId: string, restSeconds = 90): DraftExercise {
  return { key: uid(), exerciseId, sets: 3, repsMin: 8, repsMax: 12, restSeconds, notes: '' }
}

export function emptyDraft(): RoutineDraft {
  return { name: '', days: [newDay('Día 1')] }
}

/** Plantilla o rutina propia (formato del QR) → borrador editable. */
export function payloadToDraft(payload: QRPayload): RoutineDraft {
  return {
    name: payload.n,
    days: (payload.d ?? []).map((d) => ({
      key: uid(),
      name: d.n,
      isRest: Boolean(d.r),
      exercises: (d.e ?? []).map((e) => ({
        key: uid(),
        exerciseId: e.id,
        sets: e.s,
        repsMin: e.r[0],
        repsMax: e.r[1],
        restSeconds: e.rs ?? 90,
        notes: '',
      })),
    })),
  }
}

/** Devuelve el primer problema del borrador, o `null` si se puede guardar. */
export function validateDraft(draft: RoutineDraft): string | null {
  if (!draft.name.trim()) return 'Ponele un nombre a la rutina.'
  if (draft.days.length === 0) return 'Agregá al menos un día.'
  if (draft.days.length > DRAFT_LIMITS.days) return `Máximo ${DRAFT_LIMITS.days} días.`
  const trainingDays = draft.days.filter((d) => !d.isRest)
  if (trainingDays.length === 0) return 'Tiene que haber al menos un día de entrenamiento.'
  for (const day of draft.days) {
    if (!day.name.trim()) return 'Todos los días necesitan un nombre.'
    if (day.isRest) continue
    if (day.exercises.length === 0) return `"${day.name}" no tiene ejercicios.`
    if (day.exercises.length > DRAFT_LIMITS.exercisesPerDay) return `"${day.name}": máximo ${DRAFT_LIMITS.exercisesPerDay} ejercicios.`
    for (const ex of day.exercises) {
      if (ex.repsMin > ex.repsMax) return `"${day.name}": las reps mínimas superan a las máximas.`
    }
  }
  return null
}

/** Borrador → payload de la RPC. Los números se acotan igual que en el servidor. */
export function draftToRpcPayload(draft: RoutineDraft) {
  const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n)))
  return {
    name: draft.name.trim(),
    days: draft.days.map((d) => ({
      ...(d.id ? { id: d.id } : {}),
      name: d.name.trim(),
      isRest: d.isRest,
      exercises: d.isRest
        ? []
        : d.exercises.map((e) => ({
            ...(e.id ? { id: e.id } : {}),
            exerciseId: e.exerciseId,
            sets: clamp(e.sets, 1, DRAFT_LIMITS.sets),
            repsMin: clamp(e.repsMin, 1, DRAFT_LIMITS.reps),
            repsMax: clamp(e.repsMax, 1, DRAFT_LIMITS.reps),
            restSeconds: clamp(e.restSeconds, 0, DRAFT_LIMITS.restMax),
            notes: e.notes.trim(),
            supersetGroup: e.supersetGroup ?? null,
          })),
    })),
  }
}

/**
 * Enlaza o desenlaza el ejercicio `index` en superserie con el anterior. Misma
 * regla que `toggleSupersetWithPrevious` (db/routines.ts) para la rutina
 * propia, pero sobre el borrador en memoria: usa el grupo del anterior o crea
 * uno nuevo, y un grupo que queda con un solo miembro se limpia.
 */
export function toggleDraftSuperset(exercises: DraftExercise[], index: number): DraftExercise[] {
  if (index <= 0 || index >= exercises.length) return exercises
  const entry = exercises[index]!
  const prev = exercises[index - 1]!
  if (entry.supersetGroup !== undefined && entry.supersetGroup === prev.supersetGroup) {
    const group = entry.supersetGroup
    const next = exercises.map((e, i) => (i === index ? { ...e, supersetGroup: undefined } : e))
    return clearSingletonGroups(next, group)
  }
  const group = prev.supersetGroup ?? Math.max(0, ...exercises.map((e) => e.supersetGroup ?? 0)) + 1
  return exercises.map((e, i) => (i === index || i === index - 1 ? { ...e, supersetGroup: group } : e))
}

/** Saca un ejercicio y limpia su grupo si queda con un solo miembro. */
export function removeDraftExercise(exercises: DraftExercise[], key: string): DraftExercise[] {
  const removed = exercises.find((e) => e.key === key)
  const next = exercises.filter((e) => e.key !== key)
  return removed?.supersetGroup !== undefined ? clearSingletonGroups(next, removed.supersetGroup) : next
}

function clearSingletonGroups(exercises: DraftExercise[], group: number): DraftExercise[] {
  const members = exercises.filter((e) => e.supersetGroup === group)
  if (members.length !== 1) return exercises
  return exercises.map((e) => (e.supersetGroup === group ? { ...e, supersetGroup: undefined } : e))
}
