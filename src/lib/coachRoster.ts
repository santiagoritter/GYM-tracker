/** Fila del tablero de alumnos (mapea 1:1 la RPC `coach_roster`, 0025). Lógica
 * pura acá para poder testearla sin red — la consulta en sí vive en
 * coachQueries.ts. */
export interface RosterClient {
  clientId: string
  displayName: string | null
  email: string
  bondedAt: string
  weeklyGoal: number | null
  lastWorkoutAt: string | null
  workouts7d: number
  prs7d: number
  unread: number
}

export type RosterSortKey = 'name' | 'lastWorkout' | 'week' | 'prs' | 'unread'

const DAY_MS = 24 * 60 * 60 * 1000
/** A partir de acá, sin entrenar, se marca como alerta — una semana es el
 * umbral que separa "se saltó un día" de "dejó de entrenar". */
const INACTIVE_DAYS = 7

export function daysSinceWorkout(lastWorkoutAt: string | null, now = Date.now()): number | null {
  if (!lastWorkoutAt) return null
  return Math.floor((now - new Date(lastWorkoutAt).getTime()) / DAY_MS)
}

export function isInactive(c: Pick<RosterClient, 'lastWorkoutAt'>, now = Date.now()): boolean {
  const days = daysSinceWorkout(c.lastWorkoutAt, now)
  return days === null || days >= INACTIVE_DAYS
}

/** "Hoy", "Ayer", "Hace N días", o "Nunca entrenó" — mismo criterio en
 * español rioplatense que el resto de la app. */
export function lastWorkoutLabel(lastWorkoutAt: string | null, now = Date.now()): string {
  const days = daysSinceWorkout(lastWorkoutAt, now)
  if (days === null) return 'Nunca entrenó'
  if (days <= 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  return `Hace ${days} días`
}

export function sortRoster(rows: RosterClient[], key: RosterSortKey, dir: 1 | -1 = 1): RosterClient[] {
  const sorted = [...rows]
  const val = (c: RosterClient): number | string => {
    switch (key) {
      case 'name':
        return (c.displayName || c.email).toLowerCase()
      case 'lastWorkout':
        // Sin entrenos = "más viejo posible", para que quede al final
        // ordenando descendente (los más recientes primero).
        return c.lastWorkoutAt ? new Date(c.lastWorkoutAt).getTime() : -Infinity
      case 'week':
        return c.weeklyGoal ? c.workouts7d / c.weeklyGoal : c.workouts7d
      case 'prs':
        return c.prs7d
      case 'unread':
        return c.unread
    }
  }
  sorted.sort((a, b) => {
    const va = val(a)
    const vb = val(b)
    if (va < vb) return -1 * dir
    if (va > vb) return 1 * dir
    return 0
  })
  return sorted
}

export type RosterFilter = 'all' | 'inactive' | 'unread'

export function filterRoster(rows: RosterClient[], filter: RosterFilter, now = Date.now()): RosterClient[] {
  if (filter === 'inactive') return rows.filter((c) => isInactive(c, now))
  if (filter === 'unread') return rows.filter((c) => c.unread > 0)
  return rows
}
