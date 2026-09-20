import { supabase } from '@/lib/supabaseClient'
import { toLocalRow } from '@/lib/sync'
import type {
  BodyMeasurement,
  CalorieEntry,
  PersonalRecord,
  RestLog,
  Workout,
  WorkoutSet,
} from '@/types'

/**
 * Progreso completo de un alumno, leído EN VIVO del servidor (no de Dexie: es
 * data de otra persona). Todo va protegido por las policies `*_coach_read` y
 * `is_coach_of()` (0012, 0020): si el que llama no es coach ACTIVO de ese
 * alumno, las consultas devuelven vacío o fallan. Las filas se convierten al
 * modelo local con `toLocalRow` (el mismo mapeo del sync) para poder reusar las
 * libs puras (`stats`, `muscleGroupStrength`, …). Nada de fotos de progreso ni,
 * salvo permiso del alumno, calorías.
 */

const PAGE = 1000

async function fetchAll(
  table: string,
  clientId: string,
  orderBy: string,
  ascending = false
): Promise<Record<string, unknown>[]> {
  if (!supabase) return []
  const out: Record<string, unknown>[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('user_id', clientId)
      .is('deleted_at', null)
      .order(orderBy, { ascending })
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw error
    out.push(...((data ?? []) as Record<string, unknown>[]))
    if (!data || data.length < PAGE) break
  }
  return out
}

export interface ClientPhysicalProfile {
  displayName: string | null
  units: 'kg' | 'lbs'
  bodyWeightKg: number | null
  bodyFatPct: number | null
  heightCm: number | null
  dob: string | null
  sex: 'male' | 'female' | null
  goal: string | null
  level: string | null
  weeklyGoal: number | null
}

export interface ClientProgress {
  profile: ClientPhysicalProfile | null
  /** Solo entrenos terminados, del más reciente al más viejo. */
  workouts: Workout[]
  prs: PersonalRecord[]
  measurements: BodyMeasurement[]
  /** Ids del catálogo de logros (`ACHIEVEMENTS`), sin el prefijo del usuario. */
  achievementIds: string[]
  restLogs: RestLog[]
  /** El alumno habilitó que su coach vea las calorías. */
  sharesCalories: boolean
  calories: CalorieEntry[]
}

async function fetchProfile(clientId: string): Promise<ClientPhysicalProfile | null> {
  if (!supabase) return null
  const { data, error } = await supabase.rpc('coach_client_profile', { client: clientId })
  if (error) throw error
  const r = ((data ?? []) as Record<string, unknown>[])[0]
  if (!r) return null
  return {
    displayName: (r.display_name as string | null) ?? null,
    units: (r.units as 'kg' | 'lbs') ?? 'kg',
    bodyWeightKg: r.body_weight_kg != null ? Number(r.body_weight_kg) : null,
    bodyFatPct: r.body_fat_pct != null ? Number(r.body_fat_pct) : null,
    heightCm: (r.height_cm as number | null) ?? null,
    dob: (r.dob as string | null) ?? null,
    sex: (r.sex as 'male' | 'female' | null) ?? null,
    goal: (r.goal as string | null) ?? null,
    level: (r.level as string | null) ?? null,
    weeklyGoal: (r.weekly_goal as number | null) ?? null,
  }
}

async function fetchSharesCalories(clientId: string): Promise<boolean> {
  if (!supabase) return false
  const { data } = await supabase
    .from('client_sharing')
    .select('share_calories')
    .eq('client_id', clientId)
    .maybeSingle()
  return data?.share_calories === true
}

export async function fetchClientProgress(clientId: string): Promise<ClientProgress> {
  const sharesCalories = await fetchSharesCalories(clientId)
  const [profile, workouts, prs, measurements, achievements, restLogs, calories] =
    await Promise.all([
      fetchProfile(clientId),
      fetchAll('workouts', clientId, 'started_at'),
      fetchAll('personal_records', clientId, 'achieved_at'),
      fetchAll('body_measurements', clientId, 'taken_at'),
      fetchAll('achievements', clientId, 'unlocked_at'),
      fetchAll('rest_logs', clientId, 'logged_at'),
      sharesCalories ? fetchAll('calorie_entries', clientId, 'logged_at') : Promise.resolve([]),
    ])

  const prefix = `${clientId}_`
  return {
    profile,
    workouts: workouts
      .map((r) => toLocalRow('workouts', r) as unknown as Workout)
      .filter((w) => w.finishedAt),
    prs: prs.map((r) => toLocalRow('personalRecords', r) as unknown as PersonalRecord),
    measurements: measurements.map(
      (r) => toLocalRow('bodyMeasurements', r) as unknown as BodyMeasurement
    ),
    achievementIds: achievements.map((r) => {
      const id = r.id as string
      return id.startsWith(prefix) ? id.slice(prefix.length) : id
    }),
    restLogs: restLogs.map((r) => toLocalRow('restLogs', r) as unknown as RestLog),
    sharesCalories,
    calories: calories.map((r) => toLocalRow('calorieEntries', r) as unknown as CalorieEntry),
  }
}

/** Series de un entreno puntual (se piden al expandirlo, no todas juntas). */
export async function fetchWorkoutSets(clientId: string, workoutId: string): Promise<WorkoutSet[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('workout_sets')
    .select('*')
    .eq('user_id', clientId)
    .eq('workout_id', workoutId)
    .is('deleted_at', null)
    .order('set_number', { ascending: true })
  if (error) throw error
  return ((data ?? []) as Record<string, unknown>[]).map(
    (r) => toLocalRow('workoutSets', r) as unknown as WorkoutSet
  )
}

export interface RestSummaryRow {
  exerciseId: string
  exerciseName: string | null
  samples: number
  plannedSeconds: number
  medianSeconds: number
}

/** Descanso real (mediana) vs planeado por ejercicio, sin los descartados. */
export function summarizeRests(logs: readonly RestLog[]): RestSummaryRow[] {
  const byExercise = new Map<string, RestLog[]>()
  for (const l of logs) {
    if (l.discarded === 1) continue
    const arr = byExercise.get(l.exerciseId) ?? []
    arr.push(l)
    byExercise.set(l.exerciseId, arr)
  }
  const rows: RestSummaryRow[] = []
  for (const [exerciseId, arr] of byExercise) {
    const sorted = arr.map((l) => l.actualSeconds).sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    const median = sorted.length % 2 ? sorted[mid]! : Math.round((sorted[mid - 1]! + sorted[mid]!) / 2)
    const latest = [...arr].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt))[0]!
    rows.push({
      exerciseId,
      exerciseName: latest.exerciseName ?? null,
      samples: arr.length,
      plannedSeconds: latest.plannedSeconds,
      medianSeconds: median,
    })
  }
  return rows.sort((a, b) => b.samples - a.samples)
}
